
import {WebXRAdapter} from './WebXRAdapter.js?v=20261118-30';
import {MarkerARAdapter} from './MarkerARAdapter.js?v=20261118-5';
import {IOSSurfaceAdapter,requestDeviceMotionPermission} from './IOSSurfaceAdapter.js?v=20261118-30';
/** Seleção de capacidades, ciclo de câmera e retorno seguro da sessão AR. */
export class ARManager{
 constructor(arena,cards,onCard,notify){Object.assign(this,{arena,cards,onCard,notify});this.mode='3d';this.operation=0;this.switching=false;this.message=text=>{const el=document.getElementById('ar-instruction');el.textContent=text;el.hidden=!text;};}
 async capabilities(){
  if(this.capabilityCache)return this.capabilityCache;
  let webxr=false;try{webxr=!!(window.isSecureContext&&navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  return this.capabilityCache={webxr,marker:!!(window.isSecureContext&&navigator.mediaDevices?.getUserMedia),secure:window.isSecureContext};
 }
 async setMode(mode,preparedSession){
  if(mode==='3d'){await this.close();return true;}
  if(this.switching)return false;
  const operation=++this.operation;this.switching=true;
  try{
   await this.restore();const caps=await this.capabilities();if(operation!==this.operation){if(preparedSession)(await preparedSession).end();return false;}
   if(mode==='webxr'&&!caps.webxr)throw Error('AR de superfície indisponível. Use as cartas com marcadores.');
   if((mode==='marker'||mode==='ios-surface')&&!caps.marker)throw Error(caps.secure?'Câmera indisponível neste navegador.':'Abra o jogo por HTTPS para usar a câmera do celular.');
   this.message('Preparando câmera e rastreamento…');document.body.classList.add('ar-active');document.getElementById('ar-camera-controls').hidden=false;document.getElementById('ar-begin-panel').hidden=!!this.arena.battleState||!!this.arena.roomWaiting;
   const adapter=mode==='webxr'?new WebXRAdapter(this.arena,this.message,()=>{if(operation===this.operation&&!this.switching)this.close()}):mode==='ios-surface'?new IOSSurfaceAdapter(this.arena,this.message):new MarkerARAdapter(this.arena,this.cards,this.onCard,this.message);
   this.adapter=adapter;this.arena.arAdapter=adapter;
   await adapter.start(preparedSession);if(operation!==this.operation){await adapter.stop();return false;}
   this.mode=mode;this.arena.mode=mode;document.querySelector('#mode-badge span').textContent=mode==='marker'?'AR · Marcadores':'AR · Superfície';return true;
  }catch(e){
   if(operation!==this.operation)return false;
   this.lastError=e;await this.restore();
   if(e.name!=='AbortError')this.notify(e.name==='NotAllowedError'?'Autorize a câmera no navegador para jogar em AR. A arena 3D continua disponível.':e.message,true);
   return false;
  }finally{if(operation===this.operation)this.switching=false;}
 }
 async openRoom(){
  if(this.mode!=='3d'||this.switching)return true;
  const caps=this.capabilityCache||await this.capabilities();
  const ios=/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent||'');
  // A navigation from WhatsApp is not a browser user activation. Do not open
  // marker mode after WebXR rejects it: that camera never has a plane reticle.
  if(navigator.userActivation?.isActive===false&&(caps.webxr||ios))return this.showEntry();
  return this.startPreferred();
 }
 showEntry(){
  const panel=document.getElementById('room-ar-entry');if(panel){panel.hidden=false;document.getElementById('room-ar-activate').onclick=()=>this.startPreferred();document.getElementById('room-ar-later').onclick=()=>{panel.hidden=true;};}
  return false;
 }
 async startPreferred(){
  if(this.mode!=='3d')return true;if(this.switching)return false;
  const ua=navigator.userAgent||'';const ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);const mobile=ios||/Android/i.test(ua);
  if(ios&&navigator.userActivation?.isActive===false)return this.showEntry();
  // iOS requires this call to occur directly within the user's button tap.
  const motion=mobile&&window.isSecureContext&&navigator.mediaDevices?.getUserMedia?requestDeviceMotionPermission():null;
  const caps=this.capabilityCache||await this.capabilities();
  const entry=document.getElementById('room-ar-entry');if(entry)entry.hidden=true;
  if(caps.webxr){
   if(navigator.userActivation?.isActive===false)return this.showEntry();
   // Reserve the immersive session while the activation is still live, before
   // tearing down the old scene or making any asynchronous preparation.
   const prepared=WebXRAdapter.requestSession();prepared.catch(()=>{});
   const operation=this.operation;const ok=await this.setMode('webxr',prepared);
   if(ok||this.operation!==operation+1)return ok;
   if(['NotAllowedError','SecurityError','InvalidStateError'].includes(this.lastError?.name))return this.showEntry();
  }
  if(mobile&&caps.marker&&await motion){const operation=this.operation;const ok=await this.setMode('ios-surface');if(this.operation!==operation+1||ok||this.lastError?.name==='NotAllowedError')return ok;this.notify('Rastreamento de mesa indisponível. Use uma carta AR como marcador.',true);}
  else if(ios&&caps.marker){this.notify('Autorize o acesso ao movimento do aparelho para reconhecer a mesa.',true);return this.showEntry();}
  if(caps.marker)return this.setMode('marker');
  this.notify(caps.secure?'Abra o jogo em um navegador com câmera: Chrome no Android ou Safari no iPhone compatível.':'A câmera do celular exige uma URL HTTPS válida. Consulte o guia de teste no celular.',true);return false;
 }
 reposition(){if(this.adapter?.reposition)this.adapter.reposition();else this.message('Mantenha uma carta AR inteira na câmera. O tabuleiro acompanha o marcador.');}
 async close(){++this.operation;this.switching=false;await this.restore();}
 async restore(){
  const adapter=this.adapter;this.adapter=null;this.arena.arAdapter=null;
  if(adapter){try{await adapter.stop()}catch(e){console.warn(e.message)}}
  Object.assign(this,{mode:'3d'});this.arena.mode='3d';this.arena.scene.add(this.arena.board);this.arena.board.visible=true;this.arena.board.position.set(0,0,0);this.arena.board.quaternion.identity();this.arena.board.scale.setScalar(1);this.arena.stars.visible=true;this.arena.scene.background=this.arena.defaultBackground;this.arena.scene.fog=this.arena.defaultFog;this.arena.renderer.setClearAlpha(1);
  document.body.classList.remove('ar-active');document.getElementById('ar-camera-controls').hidden=true;document.getElementById('ar-begin-panel').hidden=true;this.message('');document.querySelector('#mode-badge span').textContent='Arena 3D';this.arena.resetCamera();this.arena.resize();
 }
}
