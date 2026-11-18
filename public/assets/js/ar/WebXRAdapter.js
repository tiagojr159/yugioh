import {SurfaceDetector} from './SurfaceDetector.js?v=20261118-31';
export class WebXRAdapter{
 constructor(arena,message,onExit){this.arena=arena;this.message=message;this.onExit=onExit;}
 static requestSession(){return navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay','local-floor'],domOverlay:{root:document.body}});}
 async start(preparedSession){
  this.stopped=false;const a=this.arena;this.session=await (preparedSession||WebXRAdapter.requestSession());
  if(this.stopped){await this.session.end();throw new DOMException('AR cancelada.','AbortError');}
  try{a.renderer.xr.enabled=true;a.renderer.xr.setReferenceSpaceType('local');await a.renderer.xr.setSession(this.session);this.detector=new SurfaceDetector(a.scene);await this.detector.initialize(this.session);a.board.visible=false;a.stars.visible=false;a.scene.background=null;a.scene.fog=null;a.renderer.setClearColor(0,0);this.placed=false;
   this.select=()=>{if(!this.placed&&this.detector.reticle.visible){a.board.position.setFromMatrixPosition(this.detector.reticle.matrix);a.board.quaternion.setFromRotationMatrix(this.detector.reticle.matrix);a.board.scale.setScalar(.075);a.board.visible=true;this.placed=true;this.detector.reticle.visible=false;this.message('Tabuleiro posicionado. Use os controles para jogar.');}};
   this.blockUI=e=>{if(e.target?.closest?.('button,input,select,dialog,a'))e.preventDefault()};document.body.addEventListener('beforexrselect',this.blockUI);this.session.addEventListener('select',this.select);this.session.addEventListener('end',()=>{this.cleanup();this.onExit();},{once:true});this.message('Mova o celular lentamente sobre uma mesa. Toque no círculo para posicionar.');
   this.resume=()=>{if(this.session?.visibilityState==='visible'&&!this.placed)this.detector?.initialize(this.session).catch(()=>{});};this.session.addEventListener('visibilitychange',this.resume);
   this.noOverlay=!this.session.domOverlayState;if(this.noOverlay)this.message('Tabuleiro AR sem controles sobrepostos neste navegador. Saia do AR para jogar.');
  }catch(e){await this.session.end();throw e;}
 }
 reposition(){this.placed=false;this.arena.board.visible=false;this.message('Mova o celular sobre a mesa e toque no círculo para reposicionar.');}
 update(frame){if(this.detector)this.detector.reticle.visible=!this.placed&&this.detector.reticle.visible;if(!this.placed&&frame)this.detector?.update(frame,this.arena.renderer.xr.getReferenceSpace());}
 cleanup(){this.session?.removeEventListener('visibilitychange',this.resume);this.detector?.dispose();this.detector=null;document.body.removeEventListener('beforexrselect',this.blockUI);this.arena.renderer.xr.enabled=false;}
 async stop(){this.stopped=true;if(this.session){const s=this.session;this.session=null;await s.end();}this.cleanup();}
}
