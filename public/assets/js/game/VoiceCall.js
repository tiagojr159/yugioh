import {modal,toast,escape} from '../ui/HUDManager.js';
import {CallSocket} from './CallSocket.js';

export class VoiceCall {
  constructor(api) {
    this.api=api; this.room=null; this.socket=null; this.pc=null; this.local=null;
    this.remote=document.createElement('audio'); this.remote.autoplay=false; this.remote.playsInline=true; this.remote.setAttribute('aria-hidden','true'); Object.assign(this.remote.style,{position:'fixed',width:'1px',height:'1px',opacity:'0',pointerEvents:'none',left:'-10px',bottom:'0'}); document.body.append(this.remote);
    this.pendingCandidates=[]; this.pendingOffer=null; this.callId=0; this.callerRole=''; this.calling=false; this.inCall=false; this.incomingId=0; this.cursor=0; this.polling=false; this.pollTimer=null; this.lastError='';
    this.callButtons=[...document.querySelectorAll('#voice-call-button,#ar-voice-call-button,#room-voice-call-button')]; this.muteButtons=[...document.querySelectorAll('#voice-mute-button,#ar-voice-mute-button,#room-voice-mute-button')];
    this.callButtons.forEach(button=>button.addEventListener('click',()=>this.inCall||this.calling?this.hangup():this.startCall()));
    this.muteButtons.forEach(button=>button.addEventListener('click',()=>this.toggleMute()));
  }
  async configure(state) {
    if(!state?.multiplayer||state.status!=='active'||!state.id||!['host','guest'].includes(state.my_role)) { if(this.room)this.hangup(); this.disconnect(); return; }
    const next={id:Number(state.id),key:state.voice_key,role:state.my_role,name:state.opponent_name||'Outro jogador'};
    if(this.room?.id===next.id&&this.room?.key===next.key) { this.room=next; return; }
    this.disconnect(); this.room=next; this.cursor=0; this.iceServers=[{urls:'stun:stun.l.google.com:19302'}];
    this.socket=new CallSocket(this.api,next.id,{onEvent:e=>{if(e.type==='wake'||e.type==='peer-ready')this.poll();},onStatus:connected=>this.callButtons.forEach(button=>button.classList.toggle('socket-online',connected)),onConfig:data=>{if(Array.isArray(data.ice_servers))this.iceServers=data.ice_servers;}});
    this.pollTimer=setInterval(()=>this.poll(),1300); this.poll(); this.render();
  }
  async startCall() {
    if(!this.room){toast('Entre em uma partida multiplayer ativa para chamar.',true);return;}
    if(this.calling||this.inCall)return;
    try {
      // Resume Web Audio synchronously in the call-button gesture. Safari may
      // reject a later remote-audio play() after the signaling round trips.
      const audioReady=this.prepareAudioOutput();
      await this.ensureMicrophone();
      await audioReady;
      const call=await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'start'}});
      this.callId=call.id; this.callerRole=call.role; this.calling=true; this.inCall=false; this.render(); this.makePeer();
      const offer=await this.pc.createOffer(); await this.pc.setLocalDescription(offer); await this.signal('offer',this.pc.localDescription.toJSON());
      this.socket?.send({type:'wake'}); this.poll(); toast('Chamando '+this.room.name+'...');
      this.callTimeout=setTimeout(()=>{if(this.callId&&this.pc?.connectionState!=='connected')this.hangup('A chamada nao foi atendida ou nao conectou.');},36000);
    } catch(error) {
      const callId=this.callId; this.releaseCall();
      if(callId)this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'end',call_id:callId}}).catch(()=>{});
      toast(error.message||'Nao foi possivel iniciar a chamada.',true);
    }
  }
  async ensureMicrophone() {
    if(this.local)return;
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Este navegador nao oferece microfone para chamadas.');
    this.local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  }
  prepareAudioOutput() {
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return Promise.resolve(false);
    try {
      if(!this.audioContext||this.audioContext.state==='closed')this.audioContext=new AudioContextClass();
      return this.audioContext.state==='suspended'?this.audioContext.resume().catch(error=>{console.warn('Saída de áudio:',error);return false;}):Promise.resolve(true);
    } catch(error) { console.warn('Saída de áudio:',error); return Promise.resolve(false); }
  }
  makePeer() {
    if(this.pc)return this.pc;
    if(!window.RTCPeerConnection)throw Error('Este navegador nao oferece suporte a chamadas de voz.');
    const pc=this.pc=new RTCPeerConnection({iceServers:this.iceServers||[{urls:'stun:stun.l.google.com:19302'}]});
    for(const track of this.local.getTracks())pc.addTrack(track,this.local);
    pc.onicecandidate=e=>{if(e.candidate)this.signal('ice',e.candidate.toJSON()).catch(error=>toast(error.message,true));};
    pc.ontrack=e=>{
      const stream=e.streams?.[0]||(e.track&&window.MediaStream?new MediaStream([e.track]):null);
      if(!stream)return;
      this.remote.srcObject=stream;
      if(this.audioContext&&this.audioContext.state!=='closed'){
        try {
          this.remoteSource?.disconnect();
          this.remoteSource=this.audioContext.createMediaStreamSource(stream);
          this.remoteGain=this.audioContext.createGain();this.remoteGain.gain.value=1;
          this.remoteSource.connect(this.remoteGain).connect(this.audioContext.destination);
          this.audioContext.resume().catch(()=>{});
        } catch(error) { console.warn('Áudio remoto:',error); this.remote.play().catch(()=>toast('Toque em Ativar áudio para ouvir a chamada.',true)); }
      } else this.remote.play().catch(()=>toast('Toque em Ativar áudio para ouvir a chamada.',true));
    };
    pc.onconnectionstatechange=()=>{
      if(pc.connectionState==='connected'){clearTimeout(this.callTimeout);this.calling=false;this.inCall=true;this.render();toast('Chamada de voz conectada.');}
      else if(pc.connectionState==='failed'){this.calling=false;this.inCall=false;this.render();toast('A chamada nao conectou. A rede pode exigir um servidor TURN para liberar o audio.',true);this.hangup();}
    };
    return pc;
  }
  async poll() {
    if(!this.room||this.polling)return; this.polling=true;
    try {
      const data=await this.api.request(`multiplayer/rooms/${this.room.id}/voice?after=${this.cursor}`); this.lastError='';
      if(data.call)await this.callState(data.call);
      for(const signal of data.signals||[]){await this.message(signal);this.cursor=Math.max(this.cursor,Number(signal.id)||0);}
    } catch(error) {
      if(this.room&&this.lastError!==error.message){this.lastError=error.message;toast(error.message||'Nao foi possivel sincronizar a chamada.',true);}
    } finally {this.polling=false;}
  }
  async callState(call) {
    if(this.callId&&Number(call.id)===this.callId) {
      if(call.status==='accepted'){this.calling=true;this.render();}
      else if(['declined','missed','ended'].includes(call.status)){
        const message=call.status==='declined'?'O outro jogador recusou a chamada.':call.status==='missed'?'O outro jogador nao atendeu.':'A chamada foi encerrada.';
        this.releaseCall();toast(message);
      }
      return;
    }
    if(this.callId||call.status!=='ringing'||this.room.role===call.caller_role||this.incomingId===Number(call.id))return;
    this.callId=Number(call.id);this.callerRole=call.caller_role;this.incomingId=this.callId;this.incoming();
  }
  incoming() {
    modal('Chamada de voz','<p class="modal-copy">'+escape(this.room?.name||'Outro jogador')+' esta chamando. Atenda para liberar o microfone.</p><button class="button button-gold" id="voice-accept">Atender</button> <button class="button button-end" id="voice-reject">Recusar</button>');
    document.querySelector('#voice-accept').onclick=()=>this.accept();
    document.querySelector('#voice-reject').onclick=()=>this.decline();
  }
  async accept() {
    try {
      const audioReady=this.prepareAudioOutput();
      await this.ensureMicrophone();
      await audioReady;
      await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'accept',call_id:this.callId}});
      document.querySelector('#modal').close();this.inCall=false;this.calling=true;this.makePeer();this.render();
      if(this.pendingOffer){const offer=this.pendingOffer;this.pendingOffer=null;await this.setOffer(offer);}
      await this.flushCandidates();this.socket?.send({type:'wake'});this.poll();
    } catch(error) {toast(error.message||'Nao foi possivel atender a chamada.',true);await this.hangup();}
  }
  async decline() {
    const callId=this.callId;if($('#modal')?.open)$('#modal').close();this.releaseCall();
    if(callId)try{await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'decline',call_id:callId}});this.socket?.send({type:'wake'});}catch(error){toast(error.message,true);}
  }
  async message(signal) {
    if(Number(signal.call_id)!==this.callId)return;
    try {
      if(signal.signal_type==='ice'){if(this.pc?.remoteDescription)await this.pc.addIceCandidate(signal.payload);else if(this.pendingCandidates.length<256)this.pendingCandidates.push(signal.payload);return;}
      if(signal.signal_type==='offer'){if(!this.local){this.pendingOffer=signal.payload;return;}await this.setOffer(signal.payload);return;}
      if(signal.signal_type==='answer'&&this.pc){await this.pc.setRemoteDescription(signal.payload);await this.flushCandidates();this.calling=true;this.render();}
    } catch(error) {toast(error.message||'Erro ao negociar o audio da chamada.',true);this.hangup();}
  }
  async setOffer(description) {
    const pc=this.makePeer();await pc.setRemoteDescription(description);await this.flushCandidates();
    const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await this.signal('answer',pc.localDescription.toJSON());
  }
  async flushCandidates(){if(!this.pc?.remoteDescription)return;for(const candidate of this.pendingCandidates.splice(0))await this.pc.addIceCandidate(candidate);}
  async signal(type,payload) {
    if(!this.callId)return;
    await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'signal',call_id:this.callId,type,payload}});
    this.socket?.send({type:'wake'});
  }
  toggleMute() {
    if(!this.local)return;const muted=this.local.getAudioTracks().every(track=>!track.enabled);
    for(const track of this.local.getAudioTracks())track.enabled=muted;
    this.muteButtons.forEach(button=>button.classList.toggle('is-muted',!muted));this.render();toast(muted?'Microfone ligado.':'Microfone silenciado.');
  }
  async hangup(message='Chamada encerrada.') {
    const callId=this.callId;this.releaseCall();
    if(callId&&this.room)try{await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'end',call_id:callId}});this.socket?.send({type:'wake'});}
    catch(error){toast(error.message||message,true);}
    else if(message!=='Chamada encerrada.')toast(message);
  }
  releaseCall() {
    clearTimeout(this.callTimeout);this.pc?.close();this.pc=null;
    this.remoteSource?.disconnect();this.remoteSource=null;this.remoteGain?.disconnect();this.remoteGain=null;
    if(this.audioContext&&this.audioContext.state!=='closed')this.audioContext.close().catch(()=>{});this.audioContext=null;
    for(const track of this.local?.getTracks()||[])track.stop();this.local=null;this.remote.srcObject=null;
    this.pendingCandidates=[];this.pendingOffer=null;this.callId=0;this.callerRole='';this.calling=false;this.inCall=false;this.incomingId=0;this.render();
  }
  render() {
    const ending=this.inCall||this.calling;this.callButtons.forEach(button=>{button.hidden=!this.room;button.disabled=false;button.setAttribute('aria-label',ending?'Encerrar chamada':'Iniciar chamada de voz');button.title=ending?'Encerrar chamada':'Chamar por voz';button.classList.toggle('is-active',ending);});
    const callStatus=document.querySelector('#duel-room-call-status');if(callStatus&&this.room)callStatus.textContent=this.inCall?'Chamada conectada. Use o botão para encerrar.':this.calling?'Conectando à chamada…':'Jogador conectado. Você pode iniciar a chamada de voz.';
    const muted=this.local?.getAudioTracks().every(track=>!track.enabled)??false;this.muteButtons.forEach(button=>{button.hidden=!(this.inCall||this.calling)||!this.local;button.setAttribute('aria-label',muted?'Ligar microfone':'Silenciar microfone');button.title=button.getAttribute('aria-label');button.classList.toggle('is-muted',muted);});
  }
  disconnect(){clearInterval(this.pollTimer);this.pollTimer=null;this.socket?.close();this.socket=null;this.releaseCall();this.room=null;if(this.callButton)this.callButton.hidden=true;}
  dispose(){if(this.callId)this.hangup();this.disconnect();this.remote.remove();}
}
function $(selector){return document.querySelector(selector);}
