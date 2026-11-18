import * as THREE from 'three';
import {ViroArSession,requestDeviceMotionPermission} from './viro/dist/arSession.js';

export {requestDeviceMotionPermission};

// Connect tinyvio's camera pose and planes to the existing Three.js arena.
export class IOSSurfaceAdapter{
 constructor(arena,message,Session=ViroArSession){this.arena=arena;this.message=message;this.Session=Session;this.stopped=false;this.placed=false;this.tracking=false;}
 async start(){
  const a=this.arena;this.stopped=false;this.savedCamera=a.camera;
  a.camera=new THREE.PerspectiveCamera();a.board.visible=false;a.stars.visible=false;a.scene.background=null;a.scene.fog=null;a.renderer.setClearColor(0,0);
  this.reticle=new THREE.Mesh(new THREE.RingGeometry(.085,.105,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#c8e5b1',side:THREE.DoubleSide}));this.reticle.visible=false;a.scene.add(this.reticle);
  const sceneApi={
   initAR(){},
   arSetCameraIntrinsics(){return true;},
   arSetPose:(qx,qy,qz,qw,x,y,z,state)=>{if(!this.stopped&&state!==1){a.camera.quaternion.set(qx,qy,qz,qw);if(state===3)a.camera.position.set(x,y,z);a.camera.updateMatrixWorld();}},
   getRootNode:()=>1,
   setNodeVisible:(_root,visible)=>{this.tracking=visible;if(!visible){a.board.visible=false;this.reticle.visible=false;}else if(this.placed)a.board.visible=true;}
  };
  this.session=new this.Session({sceneApi,detectPlanes:true,showCameraBackground:false,captureWidth:480,captureHeight:360,feedWidth:640,feedHeight:480,
   onStatus:(state,_quality,detail)=>{if(this.stopped)return;this.tracking=state===3;if(!this.placed){const reason=detail?.reason;this.message(reason===4?'Melhore a iluminação e mova o celular devagar.':reason===3?'Aponte para uma mesa com detalhes e mova o celular devagar.':'Mova o celular lentamente de um lado para o outro sobre a mesa.');}},
   onError:error=>console.warn('Rastreamento de superfície:',error.message)
  });
  await this.session.start();if(this.stopped){this.session.stop();throw new DOMException('AR cancelada.','AbortError');}
  this.video=this.session.video;this.video.className='camera-feed';a.container.prepend(this.video);Object.assign(this.video.style,{opacity:'1',pointerEvents:'none',zIndex:'0'});
  this.select=event=>{if(event.target!==a.renderer.domElement||!this.reticle.visible||this.placed)return;event.stopPropagation();a.board.position.copy(this.reticle.position);a.board.quaternion.identity();a.board.scale.setScalar(.075);a.board.visible=true;this.placed=true;this.reticle.visible=false;document.getElementById('ar-begin-panel').hidden=!!a.battleState;this.message('Tabuleiro posicionado. Use os controles para jogar.');};
  a.container.addEventListener('pointerup',this.select);this.resize();
  document.getElementById('ar-begin-panel').hidden=true;
  this.message('Mova o celular lentamente de um lado para o outro sobre a mesa.');
 }
 resize(){
  if(!this.video||!this.session?.appliedIntrinsics)return;const a=this.arena,r=a.container.getBoundingClientRect();if(!r.width||!r.height)return;
  const ratio=(this.video.videoWidth||640)/(this.video.videoHeight||480),w=Math.max(r.width,r.height*ratio),h=w/ratio;const f=this.session.frustumAt(w,h),near=.01,far=100;
  a.camera.projectionMatrix.makePerspective(-f.l*near,f.r*near,f.t*near,-f.b*near,near,far);a.camera.projectionMatrixInverse.copy(a.camera.projectionMatrix).invert();a.renderer.setSize(w,h,false);
  for(const el of[this.video,a.renderer.domElement])Object.assign(el.style,{position:'absolute',width:w+'px',height:h+'px',left:((r.width-w)/2)+'px',top:((r.height-h)/2)+'px'});
 }
 update(){
  if(!this.session||this.placed||!this.tracking||!this.video){if(this.reticle&&!this.placed)this.reticle.visible=false;return;}
  const r=this.arena.container.getBoundingClientRect(),v=this.video.getBoundingClientRect();const hit=this.session.hitTest(r.left+r.width/2-v.left,r.top+r.height/2-v.top,v.width,v.height).find(h=>h.normal[1]>.8);
  this.reticle.visible=!!hit;if(hit){this.reticle.position.fromArray(hit.position);this.message('Toque no círculo para posicionar o tabuleiro.');}
 }
 reposition(){this.placed=false;this.arena.board.visible=false;document.getElementById('ar-begin-panel').hidden=true;this.message('Mova o celular sobre a mesa e toque no círculo para reposicionar.');}
 async stop(){this.stopped=true;this.arena.container.removeEventListener('pointerup',this.select);this.session?.stop();this.video=null;if(this.reticle){this.reticle.removeFromParent();this.reticle.geometry.dispose();this.reticle.material.dispose();this.reticle=null;}if(this.savedCamera){this.arena.camera=this.savedCamera;this.savedCamera=null;}Object.assign(this.arena.renderer.domElement.style,{width:'100%',height:'100%',left:'0',top:'0'});}
}
