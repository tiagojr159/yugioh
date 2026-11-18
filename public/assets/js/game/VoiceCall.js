import {toast} from '../ui/HUDManager.js';
import {CallSocket} from './CallSocket.js';

// Local opt-in channel: the phone controls this device, never answers by hanging
// up a remote invitation. Only one server-assigned caller creates SDP offers.
export class VoiceCall {
 constructor(api){
  this.api=api;this.room=null;this.enabled=false;this.starting=false;this.epoch=0;this.cursor=0;this.callId=0;this.pendingCandidates=[];
  this.remote=document.createElement('audio');this.remote.autoplay=true;this.remote.playsInline=true;this.remote.setAttribute('playsinline','');
  Object.assign(this.remote.style,{position:'fixed',width:'1px',height:'1px',opacity:'0',pointerEvents:'none'});document.body.append(this.remote);
  this.callButtons=[...document.querySelectorAll('#voice-call-button,#ar-voice-call-button,#room-voice-call-button')];
  this.muteButtons=[...document.querySelectorAll('#voice-mute-button,#ar-voice-mute-button,#room-voice-mute-button')];
  this.callButtons.forEach(b=>b.addEventListener('click',()=>this.enabled?this.hangup():this.startCall()));
  this.muteButtons.forEach(b=>b.addEventListener('click',()=>this.toggleMute()));
  this.resume=()=>{if(this.enabled){this.audioContext?.resume().catch(()=>{});if(this.remote.srcObject&&!this.remote.muted)this.remote.play().catch(()=>{});this.poll();}};
  document.addEventListener('visibilitychange',this.resume);document.addEventListener('pointerdown',this.resume,{passive:true});this.render();
 }
 configure(s){
  if(!s?.multiplayer||!['waiting','active'].includes(s.status)){this.disconnect();return;}
  const room={id:Number(s.id),role:s.my_role,status:s.status,name:s.opponent_name||'Adversario'};
  if(this.room?.id===room.id){const wasWaiting=this.room.status==='waiting';this.room=room;if(wasWaiting&&room.status==='active')this.connectRoom(room);return;}
  this.disconnect();this.room=room;if(room.status==='active')this.connectRoom(room);this.render();
 }
 connectRoom(room){
  this.iceServers=[{urls:'stun:stun.l.google.com:19302'}];
  this.configReady=this.api.request(`multiplayer/rooms/${room.id}/voice-token`).then(config=>{if(this.room?.id===room.id)this.iceServers=config.ice_servers||this.iceServers;}).catch(()=>{});
  this.socket=new CallSocket(this.api,room.id,{onEvent:()=>this.poll()});
  this.timer=setInterval(()=>this.poll(),1700);this.poll();this.render();
 }
 async startCall(){
  if(!this.room||this.starting)return;
  const epoch=++this.epoch;this.enabled=true;this.starting=true;this.failed=false;this.status='Ativando microfone e audio...';this.render();
  // Both permissions/output activation are requested inside the button gesture.
  const output=this.prepareAudioOutput();
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Microfone indisponivel. Abra o jogo por HTTPS.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(epoch!==this.epoch){stream.getTracks().forEach(t=>t.stop());return;}
   this.local=stream;await output;
   if(this.room.status==='waiting'){this.status='Microfone e escuta ligados. Aguardando jogador entrar.';return;}
   await this.configReady;
   if(epoch!==this.epoch)return;
   const call=await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'start'}});
   if(epoch!==this.epoch)return;
   await this.selectCall(call);this.socket?.send({type:'wake'});
  }catch(error){if(epoch===this.epoch){await this.hangup();toast(error.message||'Nao foi possivel ativar a voz.',true);}}
  finally{if(epoch===this.epoch){this.starting=false;this.render();this.poll();}}
 }
 prepareAudioOutput(){
  try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return Promise.resolve();this.audioContext??=new Context();return this.audioContext.resume().catch(()=>{});}catch{return Promise.resolve();}
 }
 async selectCall(call){
  if(!this.enabled||!this.local||!['ringing','accepted'].includes(call?.status))return;
  if(this.callId!==Number(call.id)){this.clearPeer();this.callId=Number(call.id);this.cursor=0;}
  this.callerRole=call.caller_role||call.role;this.status=call.status==='accepted'?'Conectando audio...':'Voz ligada. Aguardando o outro jogador ativar o telefone.';
  if(this.room.role!==this.callerRole&&call.status==='ringing'){
   // This device already opted in. Join an invitation without another modal.
   call=await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'start'}});
  }
  if(!this.enabled)return;
  if(this.room.role===this.callerRole&&!this.offerSent){
   this.offerSent=true;const pc=this.makePeer(),offer=await pc.createOffer();await pc.setLocalDescription(offer);await this.signal('offer',pc.localDescription.toJSON());
  }
  this.render();
 }
 makePeer(){
  if(this.pc)return this.pc;
  if(!window.RTCPeerConnection)throw Error('Este navegador nao suporta chamada de voz.');
  const pc=this.pc=new RTCPeerConnection({iceServers:this.iceServers}),callId=this.callId;
  this.local.getTracks().forEach(t=>pc.addTrack(t,this.local));
  pc.onicecandidate=e=>{if(e.candidate&&this.pc===pc)this.signal('ice',e.candidate.toJSON(),callId).catch(()=>{});};
  pc.ontrack=e=>{
   if(this.pc!==pc)return;
   this.remoteStream=e.streams?.[0]||new MediaStream([e.track]);this.remote.srcObject=this.remoteStream;
   // Native media playback handles the phone's communication audio route. Use
   // Web Audio only if the browser rejects media autoplay (avoid double sound).
   this.remote.muted=false;
   this.remote.play().catch(()=>{
    if(!this.enabled||this.pc!==pc||!this.audioContext)return;
    this.remote.muted=true;this.remoteSource?.disconnect();this.remoteSource=this.audioContext.createMediaStreamSource(this.remoteStream);this.remoteSource.connect(this.audioContext.destination);this.audioContext.resume().catch(()=>{});
   });
  };
  pc.onconnectionstatechange=()=>{
   if(this.pc!==pc)return;
   this.inCall=pc.connectionState==='connected';
   if(this.inCall)this.status='Voz conectada. Voces podem falar e ouvir.';
   else if(['connecting','disconnected'].includes(pc.connectionState))this.status='Conectando audio...';
   else if(pc.connectionState==='failed'){this.failed=true;this.status='Audio nao conectou nesta rede. Desative e reative a voz.';toast('Nao foi possivel conectar o audio entre as redes. Confira o servidor TURN da hospedagem.',true);}
   this.render();
  };
  return pc;
 }
 async poll(){
  if(!this.room||this.room.status==='waiting'||this.polling||this.starting)return;this.polling=true;const roomId=this.room.id,epoch=this.epoch;
  try{
   const data=await this.api.request(`multiplayer/rooms/${roomId}/voice?after=${this.cursor}`);
   if(this.room?.id!==roomId||epoch!==this.epoch)return;
   const call=data.call;
   if(!this.enabled){this.status=call?.status==='ringing'||call?.status==='accepted'?'O outro jogador ativou a voz. Toque no telefone para conversar.':'Toque no telefone para ativar microfone e escuta.';return;}
   if(this.failed)return;
   if(!call||!['ringing','accepted'].includes(call.status)){
    this.clearPeer();this.callId=0;this.cursor=0;
    await this.configReady;const next=await this.api.request(`multiplayer/rooms/${roomId}/voice`,{method:'POST',data:{action:'start'}});
    if(epoch===this.epoch)await this.selectCall(next);return;
   }
   await this.selectCall(call);
   for(const item of data.signals||[]){if(epoch!==this.epoch)return;await this.message(item);this.cursor=Math.max(this.cursor,Number(item.id));}
  }catch(error){this.status=error.message||'Reconectando canal de voz...';}
  finally{this.polling=false;this.render();}
 }
 async message(item){
  if(!this.enabled||Number(item.call_id)!==this.callId)return;
  if(item.signal_type==='ice'){
   if(this.pc?.remoteDescription)await this.pc.addIceCandidate(item.payload);else this.pendingCandidates.push(item.payload);return;
  }
  if(item.signal_type==='offer'&&this.room.role!==this.callerRole){
   const pc=this.makePeer();await pc.setRemoteDescription(item.payload);await this.flushCandidates();const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await this.signal('answer',pc.localDescription.toJSON());
  }else if(item.signal_type==='answer'&&this.pc?.signalingState==='have-local-offer'){await this.pc.setRemoteDescription(item.payload);await this.flushCandidates();}
 }
 async flushCandidates(){for(const c of this.pendingCandidates.splice(0))await this.pc.addIceCandidate(c);}
 async signal(type,payload,callId=this.callId){if(!this.enabled||!callId||!this.room)return;await this.api.request(`multiplayer/rooms/${this.room.id}/voice`,{method:'POST',data:{action:'signal',call_id:callId,type,payload}});this.socket?.send({type:'wake'});}
 toggleMute(){if(!this.local)return;const muted=this.local.getAudioTracks().every(t=>!t.enabled);this.local.getAudioTracks().forEach(t=>t.enabled=muted);this.render();}
 async hangup(){
  const id=this.callId,room=this.room;this.enabled=false;this.starting=false;++this.epoch;this.callId=0;this.clearPeer();
  this.local?.getTracks().forEach(t=>t.stop());this.local=null;this.audioContext?.close().catch(()=>{});this.audioContext=null;this.status='Voz desativada neste celular.';this.render();
  if(id&&room)try{await this.api.request(`multiplayer/rooms/${room.id}/voice`,{method:'POST',data:{action:'end',call_id:id}});this.socket?.send({type:'wake'});}catch{}
 }
 clearPeer(){
  if(this.pc){this.pc.onconnectionstatechange=null;this.pc.onicecandidate=null;this.pc.ontrack=null;this.pc.close();}this.pc=null;
  this.remoteSource?.disconnect();this.remoteSource=null;this.remote.pause();this.remote.srcObject=null;this.remoteStream=null;
  this.pendingCandidates=[];this.offerSent=false;this.inCall=false;
 }
 render(){
  this.callButtons.forEach(b=>{b.hidden=!this.room;b.disabled=this.starting;b.setAttribute('aria-pressed',String(this.enabled));b.setAttribute('aria-label',this.enabled?'Desativar voz neste celular':'Ativar microfone e escuta');b.title=b.getAttribute('aria-label');b.classList.toggle('is-active',this.enabled);b.classList.toggle('voice-connected',!!this.inCall);});
  const muted=this.local?.getAudioTracks().every(t=>!t.enabled)||false;
  this.muteButtons.forEach(b=>{b.hidden=!this.enabled||!this.local;b.setAttribute('aria-label',muted?'Ligar microfone':'Silenciar microfone');b.title=b.getAttribute('aria-label');b.classList.toggle('is-muted',muted);});
  for(const selector of ['#duel-room-call-status','#ar-voice-status']){const el=document.querySelector(selector);if(el){el.textContent=this.status||'Toque no telefone para ativar a voz.';el.hidden=!this.room;}}
 }
 disconnect(){clearInterval(this.timer);this.socket?.close();this.socket=null;this.hangup();this.room=null;this.cursor=0;this.render();}
 dispose(){this.disconnect();document.removeEventListener('visibilitychange',this.resume);document.removeEventListener('pointerdown',this.resume);this.remote.remove();}
}
