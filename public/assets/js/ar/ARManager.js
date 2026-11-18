
import {WebXRAdapter} from './WebXRAdapter.js';
import {MarkerARAdapter} from './MarkerARAdapter.js?v=20261118-2';
/** Seleção de capacidades, ciclo de câmera e retorno seguro da sessão AR. */
export class ARManager{
 constructor(arena,cards,onCard,notify){Object.assign(this,{arena,cards,onCard,notify});this.mode='3d';this.operation=0;this.switching=false;this.message=text=>{const el=document.getElementById('ar-instruction');el.textContent=text;el.hidden=!text;};}
 async capabilities(){
  if(this.capabilityCache)return this.capabilityCache;
  let webxr=false;try{webxr=!!(window.isSecureContext&&navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  return this.capabilityCache={webxr,marker:!!(window.isSecureContext&&navigator.mediaDevices?.getUserMedia),secure:window.isSecureContext};
 }
 async setMode(mode){
  if(mode==='3d'){await this.close();return true;}
  if(this.switching)return false;
  const operation=++this.operation;this.switching=true;
  try{
   await this.restore();const caps=await this.capabilities();if(operation!==this.operation)return false;
   if(mode==='webxr'&&!caps.webxr)throw Error('AR de superfície indisponível. Use as cartas com marcadores.');
   if(mode==='marker'&&!caps.marker)throw Error(caps.secure?'Câmera indisponível neste navegador.':'Abra o jogo por HTTPS para usar a câmera do celular.');
   this.message('Preparando câmera e rastreamento…');document.body.classList.add('ar-active');document.getElementById('ar-camera-controls').hidden=false;document.getElementById('ar-begin-panel').hidden=!!this.arena.battleState;
   const adapter=mode==='webxr'?new WebXRAdapter(this.arena,this.message,()=>{if(operation===this.operation&&!this.switching)this.close()}):new MarkerARAdapter(this.arena,this.cards,this.onCard,this.message);
   this.adapter=adapter;this.arena.arAdapter=adapter;
   await adapter.start();if(operation!==this.operation){await adapter.stop();return false;}
   this.mode=mode;this.arena.mode=mode;document.querySelector('#mode-badge span').textContent=mode==='webxr'?'AR · Superfície':'AR · Marcadores';return true;
  }catch(e){
   if(operation!==this.operation)return false;
   this.lastError=e;await this.restore();
   if(e.name!=='AbortError')this.notify(e.name==='NotAllowedError'?'Autorize a câmera no navegador para jogar em AR. A arena 3D continua disponível.':e.message,true);
   return false;
  }finally{if(operation===this.operation)this.switching=false;}
 }
 async startPreferred(){
  const caps=await this.capabilities();
  if(caps.webxr){const operation=this.operation;const ok=await this.setMode('webxr');if(this.operation!==operation+1||ok||this.lastError?.name==='NotAllowedError')return ok;}
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
