import test from 'node:test';
import assert from 'node:assert/strict';
import {Multiplayer} from '../../public/assets/js/game/Multiplayer.js';
import {VoiceCall} from '../../public/assets/js/game/VoiceCall.js';
import {BattleManager} from '../../public/assets/js/game/BattleManager.js';
import {summonReason,attackPreview} from '../../public/assets/js/game/Combat.js';
import {AnimationManager} from '../../public/assets/js/game/AnimationManager.js';

const element=()=>({hidden:false,style:{},textContent:'',setAttribute(){},classList:{toggle(){}},append(){},remove(){},pause(){},async play(){this.played=true;}});
function dom(){
 const elements=new Map();globalThis.document={hidden:false,body:{append(){},classList:{add(){},remove(){}}},createElement:element,querySelectorAll:()=>[],querySelector:key=>{if(!elements.has(key))elements.set(key,element());return elements.get(key);},addEventListener(){},removeEventListener(){}};
 globalThis.window={};globalThis.matchMedia=()=>({matches:false});return elements;
}
const cards=[{id:1,cost:2},{id:2,cost:4},{id:3,cost:3}];
const state=()=>({id:9,status:'active',version:1,turn:1,active_side:'player',opponent_name:'Outro jogador',player:{hand:[1,2,3],energy:3,field:[],summoned:false},ai:{field:[]}});
test('Invocacao continua disponivel apos selecionar carta do campo ou carta cara',async()=>{
 dom();const cm={cards,selected:cards[1],select(id){this.selected=cards.find(c=>c.id===id);}};
 const b=new BattleManager({},null,null,null,cm,()=>{});b.state=state();let submitted;b.action=async(action,data)=>submitted={action,...data};
 assert.equal(summonReason(b.state,cards,cm.selected),'');await b.summon();assert.deepEqual(submitted,{action:'summon',card_id:1});
 cm.selected={id:99,cost:1};await b.summon();assert.equal(submitted.card_id,1);
});
test('Estado do convidado normaliza ids MySQL antes de habilitar a mao',async()=>{
 dom();let rendered;const cm={cards,selected:null,render(hand){rendered=hand;}};
 const arena={async sync(){},arAdapter:{syncState(){}}};const b=new BattleManager({},arena,{}, {update(){}},cm,()=>{});
 const s=state();s.player.hand=['1','2'];s.catalog=[{id:'1',cost:'2'},{id:'2',cost:'4'}];await b.setState(s);
 assert.deepEqual(rendered,[1,2]);assert.equal(cm.selected.id,1);assert.equal(summonReason(b.state,cm.cards,cm.selected),'');
});
test('Previsao de ataque considera escudo, geada, dano minimo e perfuracao',()=>{
 const attacker={attack:1200,ability:'pierce',weakened_until:3};const target={hp:500,defense:400,ability:'shield'};
 assert.deepEqual(attackPreview(attacker,target,3),{damage:400,direct:160,defeated:false});
 assert.deepEqual(attackPreview(attacker,target,4),{damage:600,direct:260,defeated:true});
 assert.equal(attackPreview({attack:0},null,1).damage,100);
});
test('Trocar para WhatsApp nao deixa a animacao esperando rAF suspenso',async()=>{
 dom();globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const animation=new AnimationManager({}, {}, []);let final=0;await animation.tween(10,p=>final=p);assert.equal(final,1);
});
class Peer {
 constructor(config){this.config=config;this.signalingState='stable';this.connectionState='new';}
 addTrack(){}
 async createOffer(){return {type:'offer',sdp:'offer'};}
 async createAnswer(){return {type:'answer',sdp:'answer'};}
 async setLocalDescription(d){this.localDescription={...d,toJSON:()=>d};this.signalingState=d.type==='offer'?'have-local-offer':'stable';this.connect();}
 async setRemoteDescription(d){this.remoteDescription=d;this.signalingState=d.type==='offer'?'have-remote-offer':'stable';this.ontrack?.({streams:[{id:'remote-audio'}]});this.connect();}
 connect(){if(this.remoteDescription&&this.localDescription){this.connectionState='connected';this.onconnectionstatechange?.();}}
 async addIceCandidate(c){(this.ice??=[]).push(c);}
 close(){this.connectionState='closed';}
}
function server(){
 let call=null,seq=0;const signals=[];
 return {signals,get call(){return call;},api(role){return {async request(path,{data}={}){
  if(path.endsWith('voice-token'))return {enabled:false,ice_servers:[{urls:'turn:configured.test',username:'test',credential:'test'}]};
  if(!data){const after=Number(path.split('after=')[1]||0);return {call:call?{...call}:null,signals:signals.filter(s=>s.recipient===role&&s.id>after&&s.call_id===call?.id)};}
  if(data.action==='start'){
   if(!call||call.status==='ended')call={id:++seq,caller_role:role,status:'ringing'};
   else if(role!==call.caller_role)call.status='accepted';
   return {...call,role};
  }
  if(data.action==='end'){call.status='ended';return {ok:true};}
  if(data.action==='signal'){signals.push({id:signals.length+1,call_id:data.call_id,recipient:role==='host'?'guest':'host',signal_type:data.type,payload:data.payload});return {ok:true};}
  throw Error('Unexpected request '+path);
 } }; } };
}
const flush=()=>new Promise(r=>setImmediate(r));
test('Dois telefones ativam o mesmo canal; sair em um nao desativa microfone no outro',async()=>{
 dom();globalThis.RTCPeerConnection=window.RTCPeerConnection=Peer;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getUserMedia(){const track={enabled:true,stopped:false,stop(){this.stopped=true;}};return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}}});
 const service=server(),host=new VoiceCall(service.api('host')),guest=new VoiceCall(service.api('guest'));
 try{
  host.configure({multiplayer:true,status:'active',id:1,my_role:'host'});guest.configure({multiplayer:true,status:'active',id:1,my_role:'guest'});await flush();
  await Promise.all([host.startCall(),guest.startCall()]);await flush();
  for(let i=0;i<4;i++){await host.poll();await guest.poll();}
  assert.equal(host.enabled,true);assert.equal(guest.enabled,true);assert.equal(service.call.status,'accepted');assert.equal(host.callId,guest.callId);
  assert.equal(service.signals.filter(s=>s.signal_type==='offer').length,1);assert.equal(host.inCall,true);assert.equal(guest.inCall,true);
  assert.equal(host.remote.srcObject.id,'remote-audio');assert.equal(guest.remote.played,true);assert.equal(host.pc.config.iceServers[0].urls,'turn:configured.test');
  const hostTrack=host.local.getTracks()[0],guestTrack=guest.local.getTracks()[0];await guest.hangup();assert.equal(guestTrack.stopped,true);assert.equal(hostTrack.stopped,false);assert.equal(host.enabled,true);
  await host.poll();await guest.poll();assert.equal(service.call.status,'ringing');assert.equal(guest.enabled,false);
  await guest.startCall();await flush();for(let i=0;i<4;i++){await host.poll();await guest.poll();}assert.equal(host.inCall,true);assert.equal(guest.inCall,true);
 }finally{host.dispose();guest.dispose();}
});

test('Anfitriao sozinho preserva tabuleiro posicionado; convidado aparece sem reiniciar AR',async()=>{
 dom();globalThis.localStorage={setItem(){},getItem(){return null;},removeItem(){}};
 const visibility=[],board={visible:true,position:{x:1,y:2,z:3}};
 const arena={board,clearUnits(){},setOpponentVisible:v=>visibility.push(v),setOpponentName(name){this.name=name;},async sync(){},arAdapter:{syncState(){}}};
 const cm={cards,render(){},selected:cards[0]},b=new BattleManager({},arena,{}, {update(){},hp(){}},cm,()=>{});
 const mp=new Multiplayer({api:{},getBattle:()=>b,getUser:()=>({name:'Host'}),onJoined(){}});mp.room=9;let cameraStarts=0;mp.onEnterRoom=()=>cameraStarts++;
 mp.prepareWaiting();assert.equal(b.state,null);assert.equal(visibility.at(-1),false);assert.equal(arena.roomWaiting,true);assert.equal(board.visible,true);
 const s=state();s.my_role='host';s.multiplayer=true;await mp.apply(s);
 assert.equal(arena.roomWaiting,false);assert.equal(visibility.at(-1),true);assert.equal(arena.name,s.opponent_name);assert.deepEqual(board.position,{x:1,y:2,z:3});assert.equal(cameraStarts,0);
});
test('Anfitriao ativa microfone enquanto espera e conserva stream quando convidado entra',async()=>{
 dom();globalThis.RTCPeerConnection=window.RTCPeerConnection=Peer;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getUserMedia(){const track={enabled:true,stop(){this.stopped=true;}};return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}}});
 const service=server(),host=new VoiceCall(service.api('host'));
 try{
  host.configure({multiplayer:true,status:'waiting',id:1,my_role:'host'});await host.startCall();const stream=host.local;assert.equal(host.enabled,true);assert.equal(service.call,null);
  host.configure({multiplayer:true,status:'active',id:1,my_role:'host'});await flush();await host.poll();assert.equal(host.local,stream);assert.equal(service.call.status,'ringing');
 }finally{host.dispose();}
});
