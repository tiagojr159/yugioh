const VISION_ASSETS=new URL('../../vendor/mediapipe/0.10.32/',import.meta.url);
const AIM_MS=140;
const TRACKING_GRACE_MS=150;
const HOLD_MS={pinch:160,fist:300};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class HandGestureController{
 constructor({container,status,arena,cardAt,onSummon,onAttack,onStop}){
  Object.assign(this,{container,status,arena,cardAt,onSummon,onAttack,onStop});
  this.video=document.createElement('video');
  this.video.playsInline=true;
  this.video.muted=true;
  this.cursorLayer=document.createElement('div');
  this.cursorLayer.className='gesture-cursors';
  this.cursorLayer.setAttribute('aria-hidden','true');
  this.cursors=Array.from({length:2},()=>{
   const view=document.createElement('div');
   view.className='gesture-cursor-eye';
   const cursor=document.createElement('div');
   cursor.className='gesture-cursor';
   cursor.hidden=true;
   const label=document.createElement('span');
   label.className='gesture-cursor-label';
   cursor.append(label);
   view.append(cursor);
   this.cursorLayer.append(view);
   return {view,cursor,label};
  });
  this.container.append(this.cursorLayer);
  this.observer=new ResizeObserver(()=>{
   this.resetAim();
   this.hideCursors();
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
   await this.video.play();
   if(this.operation!==operation)return false;
   this.lastFrame=-1;
   this.lastInference=-Infinity;
   this.lastHandAt=-Infinity;
   this.setStatus('Carregando o rastreador de mãos…');
   const {FilesetResolver,HandLandmarker}=await import(new URL('vision_bundle.js',VISION_ASSETS).href);
   const files=await FilesetResolver.forVisionTasks(new URL('wasm',VISION_ASSETS).href);
   if(this.operation!==operation)return false;
   const detector=await HandLandmarker.createFromOptions(files,{
    baseOptions:{modelAssetPath:new URL('hand_landmarker.task',VISION_ASSETS).href},
    runningMode:'VIDEO',
    numHands:1,
    minHandDetectionConfidence:.5,
    minHandPresenceConfidence:.5,
    minTrackingConfidence:.5
   });
   if(this.operation!==operation){detector.close();return false;}
   this.detector=detector;
   this.running=true;
   this.observer.observe(this.container);
   this.setStatus('Mostre a mão à câmera para guiar a varinha.');
   this.raf=requestAnimationFrame(now=>this.frame(now));
   return true;
  }catch(error){
   if(this.operation!==operation)return false;
   let message=error.message||'Não foi possível ligar a câmera.';
   if(error.name==='NotAllowedError')message='Autorize a câmera para usar os gestos.';
   else if(this.video.readyState>=2){
    console.error('Não foi possível carregar os arquivos do rastreador de mãos:',error);
    message='Falha ao carregar o rastreador de mãos. Toque em Ligar câmera e gestos para tentar novamente.';
   }
   this.stop(message);
   throw Error(message);
  }
 }
 setStatus(message){
  if(this.status.textContent!==message)this.status.textContent=message;
  this.status.hidden=!message;
 }
 frame(now){
  if(!this.running)return;
  this.raf=requestAnimationFrame(time=>this.frame(time));
  if(this.arena.mode!=='3d'){this.stop();return;}
  if(now-this.lastHandAt>TRACKING_GRACE_MS)this.hideCursors();
  if(this.video.readyState<2||now-this.lastInference<48||this.video.currentTime===this.lastFrame)return;
  this.lastInference=now;
  this.lastFrame=this.video.currentTime;
  try{
   const result=this.detector.detectForVideo(this.video,now);
   const points=result.landmarks?.[0];
   if(!points){
    this.resetAim();
    if(now-this.lastHandAt>TRACKING_GRACE_MS){
     this.setStatus('Mostre a mão à câmera. Se estiver muito perto, afaste-a um pouco.');
    }
    return;
   }
   if(now-this.lastHandAt>TRACKING_GRACE_MS)this.setStatus('Aponte a varinha para uma carta ou criatura sua.');
   this.lastHandAt=now;
   const views=this.arena.stereoEnabled?2:1;
   const width=this.container.clientWidth/views,height=this.container.clientHeight;
   if(!width||!height)return;
   const gesture=this.classify(result.worldLandmarks?.[0]||points);
   const sw=this.video.videoWidth,sh=this.video.videoHeight;
   // The wand tip and target selection use the same camera coordinates.
   const scale=Math.max(width/sw,height/sh);
   const vw=sw*scale,vh=sh*scale;
   const anchor=gesture==='fist'?points[9]:points[8];
   const x=this.mirrored?1-anchor.x:anchor.x;
   const position={
    x:Math.max(.02,Math.min(.98,.5+(x-.5)*vw/width)),
    y:Math.max(.03,Math.min(.97,.5+(anchor.y-.5)*vh/height))
   };
   const aimGesture=gesture==='open'||gesture==='point';
   let hit=null;
   if(aimGesture){
    hit=this.cardAt?.(position);
    if(!hit){
     const unit=this.arena.gestureCreatureAt(position.x,position.y);
     if(unit)hit={kind:'creature',id:unit.id,name:unit.name,blocked:unit.attacked};
    }
   }
   const commandTarget=this.hold?this.aim?.target:null;
   this.updateGesture(gesture,hit,position,now);
   const target=hit||(this.hold?this.aim?.target:commandTarget);
   const cursorPosition=this.hold?this.aim.position:position;
   this.drawCursors(cursorPosition,views,target);
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
  if(extended[0])return 'point';
  return 'other';
 }
 drawCursors(position,views,target){
  const {x,y}=position;
  const ready=target&&this.aim?.ready;
  const label=target?.blocked?'Já atacou':target?target.name:'';
  this.cursors.forEach(({view,cursor,label:caption},eye)=>{
   view.hidden=eye>=views;
   cursor.hidden=view.hidden;
   if(view.hidden)return;
   cursor.style.left=x*100+'%';
   cursor.style.top=y*100+'%';
   cursor.dataset.ready=String(!!ready&&!target.blocked);
   cursor.dataset.holding=String(!!this.hold);
   cursor.dataset.side=x>.69?'left':'right';
   if(caption.textContent!==label)caption.textContent=label;
  });
 }
 hideCursors(){
  for(const {cursor} of this.cursors)cursor.hidden=true;
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
  this.hideCursors();
  this.resetAim();
  this.setStatus(message);
  this.onStop?.();
 }
}
