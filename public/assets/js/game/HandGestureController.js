const VISION_CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32';
const MODEL_URL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const OUTLINE=[0,1,2,3,4,8,7,6,5,9,10,11,12,16,15,14,13,17,18,19,20];
const AIM_MS=140;
const HOLD_MS={pinch:160,fist:300};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class HandGestureController{
 constructor({container,canvas,status,arena,cardAt,onSummon,onAttack,onStop}){
  Object.assign(this,{container,canvas,status,arena,cardAt,onSummon,onAttack,onStop});
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
 async start(facingMode='user'){
  if(this.operation)return false;
  const operation=this.operation={};
  this.setStatus('Aguardando a câmera…');
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
    throw Error('Abra a arena por HTTPS para usar a câmera.');
   }
   const stream=await navigator.mediaDevices.getUserMedia({
    audio:false,video:{facingMode:{ideal:facingMode},width:{ideal:640},height:{ideal:480}}
   });
   if(this.operation!==operation){stream.getTracks().forEach(track=>track.stop());return false;}
   this.stream=stream;
   this.facingMode=stream.getVideoTracks()[0]?.getSettings().facingMode||facingMode;
   this.mirrored=this.facingMode!=='environment';
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
   this.setStatus('Mostre a palma à câmera.');
   this.raf=requestAnimationFrame(now=>this.frame(now));
   return true;
  }catch(error){
   if(this.operation!==operation)return false;
   const message=error.name==='NotAllowedError'?'Autorize a câmera para usar os gestos.':
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
   const views=this.arena.stereoEnabled?2:1;
   const width=Math.floor(this.canvas.width/views);
   const height=this.canvas.height;
   if(!width||!height)return;
   if(!points){
    this.resetAim();
    this.drawCameraPreview(width,height,views);
    this.setStatus('Câmera ligada · mostre a palma na miniatura e afaste a mão um pouco.');
    return;
   }
   const gesture=this.classify(result.worldLandmarks?.[0]||points);
   const sw=this.video.videoWidth,sh=this.video.videoHeight;
   const scale=Math.min(width/sw,height/sh);
   const vw=sw*scale,vh=sh*scale;
   const left=(width-vw)/2,top=(height-vh)/2;
   const map=point=>({x:left+(this.mirrored?1-point.x:point.x)*vw,y:top+point.y*vh});
   const anchor=map(gesture==='fist'?points[9]:points[8]);
   const position={x:anchor.x/width,y:anchor.y/height};
   const aimGesture=gesture==='open'||gesture==='point';
   let hit=null;
   if(aimGesture){
    hit=this.cardAt?.(position);
    if(!hit){
     const unit=this.arena.gestureCreatureAt(position.x,position.y);
     if(unit)hit={kind:'creature',id:unit.id,name:unit.name,blocked:unit.attacked};
    }
   }
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
  const fingersCurled=extended.every(value=>!value)&&
   [8,12,16,20].every(tip=>distance(points[tip],points[0])<palm*1.22);
  const pinch=distance(points[4],points[8])<palm*.30;
  // A pinça pode formar um círculo com o indicador, mesmo com os outros dedos dobrados.
  if(pinch&&(!fingersCurled||distance(points[8],points[5])>palm*.55))return 'pinch';
  if(fingersCurled)return 'fist';
  if(extended.every(Boolean))return 'open';
  if(extended[0]&&extended.slice(1).every(value=>!value))return 'point';
  return 'other';
 }
 updateGesture(gesture,hit,position,now){
  if(gesture==='open'||gesture==='point'){
   this.released=true;
   this.hold=null;
   if(!hit||hit.blocked){
    if(this.aim&&!this.aim.ready)this.aim=null;
    if(hit?.blocked)this.aim=null;
    this.setStatus(hit?.blocked?'Essa criatura já atacou.':'Mire sobre uma carta ou criatura sua.');
    return;
   }
   if(!this.aim||this.aim.target.kind!==hit.kind||this.aim.target.id!==hit.id||now-this.aim.lastSeen>220){
    this.aim={target:hit,since:now};
   }
   Object.assign(this.aim,{position,lastSeen:now,ready:now-this.aim.since>=AIM_MS});
   const instruction=hit.kind==='card'?'Faça uma pinça para invocar.':'Feche a mão para atacar.';
   this.setStatus(this.aim.ready?hit.name+' · '+instruction:'Mirando em '+hit.name+'…');
   return;
  }
  const duration=HOLD_MS[gesture];
  if(!duration||!this.released){
   this.hold=null;
   if(this.released)this.setStatus('Abra a mão ou aponte para mirar.');
   return;
  }
  const aim=this.aim;
  const near=aim&&Math.hypot(position.x-aim.position.x,position.y-aim.position.y)<.22;
  if(!aim?.ready||!near||(!this.hold&&now-aim.lastSeen>500)){
   this.hold=null;
   this.setStatus('Aponte sobre uma carta ou criatura antes de fazer o gesto.');
   return;
  }
  const summoning=aim.target.kind==='card';
  if(gesture!==(summoning?'pinch':'fist')){
   this.hold=null;
   this.setStatus(summoning?'Faça uma pinça sobre a carta para invocar.':'Feche o punho sobre sua criatura para atacar.');
   return;
  }
  if(this.hold?.gesture!==gesture)this.hold={gesture,since:now};
  if(now-this.hold.since<duration){
   this.setStatus(aim.target.name+' · Segure o gesto…');
   return;
  }
  this.released=false;
  this.aim=null;
  this.hold=null;
  const requested=summoning?this.onSummon(aim.target.id):this.onAttack(aim.target.id);
  this.setStatus(requested?(summoning?'Invocação enviada':'Ataque enviado')+' · abra a mão para mirar de novo.':
   'Ação indisponível · abra a mão para tentar de novo.');
 }
 drawCameraPreview(width,height,views){
  const ctx=this.ctx;
  const previewWidth=Math.min(width*.32,height*.31);
  const previewHeight=previewWidth*this.video.videoHeight/this.video.videoWidth;
  for(let eye=0;eye<views;eye++){
   const left=eye*width+width-previewWidth-10,top=height*.18;
   ctx.save();
   ctx.translate(left+(this.mirrored?previewWidth:0),top);
   if(this.mirrored)ctx.scale(-1,1);
   ctx.drawImage(this.video,0,0,previewWidth,previewHeight);
   ctx.restore();
   ctx.strokeStyle='#a5ffd4';
   ctx.lineWidth=2;
   ctx.strokeRect(left,top,previewWidth,previewHeight);
  }
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
  mask.beginPath();
  for(const index of [0,1,5,9,13,17]){
   const {x,y}=points[index];
   if(index===0)mask.moveTo(x,y);
   else mask.lineTo(x,y);
  }
  mask.closePath();
  mask.fill();
  mask.save();
  mask.globalCompositeOperation='source-in';
  mask.translate(left+(this.mirrored?vw:0),top);
  if(this.mirrored)mask.scale(-1,1);
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
