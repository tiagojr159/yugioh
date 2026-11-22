const VISION_CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32';
const MODEL_URL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const OUTLINE=[0,1,2,3,4,8,7,6,5,9,10,11,12,16,15,14,13,17,18,19,20];
const AIM_MS=140;
const HOLD_MS={pinch:160,fist:300};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class HandGestureController{
 constructor({container,canvas,status,arena,onAttack,onStop}){
  Object.assign(this,{container,canvas,status,arena,onAttack,onStop});
  this.video=document.createElement('video');
  this.video.playsInline=true;
  this.video.muted=true;
  this.mask=document.createElement('canvas');
  this.maskContext=this.mask.getContext('2d');
  this.ctx=canvas.getContext('2d');
  this.observer=new ResizeObserver(()=>{
   this.resize();
   this.resetAim();
  });
  this.running=false;
 }
 async start(){
  if(this.operation)return false;
  const operation=this.operation={};
  this.setStatus('Aguardando a câmera frontal…');
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
    throw Error('Abra a arena por HTTPS para usar a câmera.');
   }
   const stream=await navigator.mediaDevices.getUserMedia({
    audio:false,video:{facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480}}
   });
   if(this.operation!==operation){stream.getTracks().forEach(track=>track.stop());return false;}
   this.stream=stream;
   for(const track of stream.getVideoTracks()){
    track.addEventListener('ended',()=>{
     if(this.operation===operation)this.stop('Câmera desconectada. Toque para tentar de novo.');
    },{once:true});
   }
   this.video.srcObject=stream;
   this.setStatus('Carregando o rastreador de mãos…');
   const {FilesetResolver,HandLandmarker}=await import(VISION_CDN+'/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks(VISION_CDN+'/wasm');
   if(this.operation!==operation)return false;
   const detector=await HandLandmarker.createFromOptions(files,{
    baseOptions:{modelAssetPath:MODEL_URL},
    runningMode:'VIDEO',
    numHands:1,
    minHandDetectionConfidence:.5,
    minHandPresenceConfidence:.5,
    minTrackingConfidence:.5
   });
   if(this.operation!==operation){detector.close();return false;}
   this.detector=detector;
   await this.video.play();
   if(this.operation!==operation)return false;
   this.lastFrame=-1;
   this.lastInference=-Infinity;
   this.running=true;
   this.resize();
   this.observer.observe(this.container);
   this.setStatus('Mostre a palma à câmera frontal.');
   this.raf=requestAnimationFrame(now=>this.frame(now));
   return true;
  }catch(error){
   if(this.operation!==operation)return false;
   const message=error.name==='NotAllowedError'?'Autorize a câmera frontal para usar os gestos.':
    error.message||'Não foi possível carregar os gestos.';
   this.stop(message);
   throw Error(message);
  }
 }
 setStatus(message){
  if(this.status.textContent!==message)this.status.textContent=message;
  this.status.hidden=!message;
 }
 resize(){
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  this.canvas.width=Math.max(1,Math.round(this.container.clientWidth*dpr));
  this.canvas.height=Math.max(1,Math.round(this.container.clientHeight*dpr));
 }
 frame(now){
  if(!this.running)return;
  this.raf=requestAnimationFrame(time=>this.frame(time));
  if(this.arena.mode!=='3d'){this.stop();return;}
  if(this.video.readyState<2||now-this.lastInference<48||this.video.currentTime===this.lastFrame)return;
  this.lastInference=now;
  this.lastFrame=this.video.currentTime;
  try{
   const result=this.detector.detectForVideo(this.video,now);
   this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   const points=result.landmarks?.[0];
   if(!points){
    this.aim=null;
    this.hold=null;
    this.setStatus('Mostre a mão à câmera frontal. Afaste-a um pouco se estiver muito perto.');
    return;
   }
   const gesture=this.classify(result.worldLandmarks?.[0]||points);
   const width=this.arena.stereoEnabled?Math.floor(this.canvas.width/2):this.canvas.width;
   const height=this.canvas.height;
   if(!width||!height)return;
   const sw=this.video.videoWidth,sh=this.video.videoHeight;
   const scale=Math.min(width/sw,height/sh);
   const vw=sw*scale,vh=sh*scale;
   const left=(width-vw)/2,top=(height-vh)/2;
   const map=point=>({x:left+(1-point.x)*vw,y:top+point.y*vh});
   const anchor=map(gesture==='fist'?points[9]:points[8]);
   const position={x:anchor.x/width,y:anchor.y/height};
   const aimGesture=gesture==='open'||gesture==='point';
   const hit=aimGesture?this.arena.gestureCreatureAt(position.x,position.y):null;
   this.updateGesture(gesture,hit,position,now);
   this.drawHand(points.map(map),anchor,{left,top,vw,vh,width,height},!!hit||!!this.hold);
  }catch(error){
   console.error('Rastreamento de mãos interrompido:',error);
   this.stop('Rastreamento interrompido. Toque para ativar novamente.');
  }
 }
 classify(points){
  const palm=distance(points[0],points[9]);
  if(palm<.001)return 'other';
  const extended=[8,12,16,20].map(tip=>
   distance(points[tip],points[0])-distance(points[tip-2],points[0])>palm*.18
  );
  if(distance(points[4],points[8])<palm*.27)return 'pinch';
  if(extended.every(value=>!value))return 'fist';
  if(extended.every(Boolean))return 'open';
  if(extended[0]&&extended.slice(1).every(value=>!value))return 'point';
  return 'other';
 }
 updateGesture(gesture,hit,position,now){
  if(gesture==='open'||gesture==='point'){
   this.released=true;
   this.hold=null;
   if(!hit||hit.attacked){
    if(this.aim&&!this.aim.ready)this.aim=null;
    this.setStatus(hit?.attacked?'Essa criatura já atacou.':'Mire sobre uma criatura sua que já esteja no campo.');
    return;
   }
   if(this.aim?.unit.id!==hit.id||now-this.aim.lastSeen>220){
    this.aim={unit:hit,since:now};
   }
   Object.assign(this.aim,{position,lastSeen:now,ready:now-this.aim.since>=AIM_MS});
   this.setStatus(this.aim.ready?hit.name+' · Faça uma pinça ou feche a mão.':'Mirando em '+hit.name+'…');
   return;
  }
  const duration=HOLD_MS[gesture];
  if(!duration||!this.released){
   this.hold=null;
   if(this.released)this.setStatus('Abra a mão ou aponte para uma criatura sua.');
   return;
  }
  const aim=this.aim;
  const near=aim&&Math.hypot(position.x-aim.position.x,position.y-aim.position.y)<.22;
  if(!aim?.ready||!near||(!this.hold&&now-aim.lastSeen>500)){
   this.hold=null;
   this.setStatus('Abra a mão ou aponte sobre sua criatura antes do ataque.');
   return;
  }
  if(this.hold?.gesture!==gesture)this.hold={gesture,since:now};
  if(now-this.hold.since<duration){
   this.setStatus(aim.unit.name+' · Segure o gesto…');
   return;
  }
  this.released=false;
  this.aim=null;
  this.hold=null;
  const requested=this.onAttack(aim.unit.id);
  this.setStatus(requested?'Comando de ataque enviado · abra a mão para mirar de novo.':
   'Ataque indisponível · abra a mão para tentar de novo.');
 }
 drawHand(points,anchor,{left,top,vw,vh,width,height},aimed){
  if(this.mask.width!==width)this.mask.width=width;
  if(this.mask.height!==height)this.mask.height=height;
  const mask=this.maskContext;
  mask.clearRect(0,0,width,height);
  mask.lineJoin='round';
  mask.lineCap='round';
  mask.lineWidth=Math.max(3,Math.hypot(points[0].x-points[9].x,points[0].y-points[9].y)*.18);
  mask.beginPath();
  for(const [index,key] of OUTLINE.entries()){
   const {x,y}=points[key];
   if(index===0)mask.moveTo(x,y);
   else mask.lineTo(x,y);
  }
  mask.closePath();
  mask.fill();
  mask.stroke();
  mask.save();
  mask.globalCompositeOperation='source-in';
  mask.translate(left+vw,top);
  mask.scale(-1,1);
  mask.drawImage(this.video,0,0,vw,vh);
  mask.restore();

  const views=this.arena.stereoEnabled?2:1;
  const ctx=this.ctx;
  for(let eye=0;eye<views;eye++){
   const offset=eye*width;
   ctx.drawImage(this.mask,offset,0);
   ctx.beginPath();
   ctx.arc(offset+anchor.x,anchor.y,aimed?10:6,0,2*Math.PI);
   ctx.strokeStyle=aimed?'#a5ffd4':'#ffffff';
   ctx.lineWidth=2;
   ctx.stroke();
  }
 }
 resetAim(){
  this.aim=null;
  this.hold=null;
  this.released=false;
 }
 stop(message=''){
  this.operation=null;
  this.running=false;
  cancelAnimationFrame(this.raf);
  this.observer.disconnect();
  this.stream?.getTracks().forEach(track=>track.stop());
  this.stream=null;
  this.video.pause();
  this.video.srcObject=null;
  this.detector?.close();
  this.detector=null;
  this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  this.resetAim();
  this.setStatus(message);
  this.onStop?.();
 }
}
