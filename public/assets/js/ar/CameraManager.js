export class CameraManager{
 async start(container){
  this.cancelled=false;
  if(!window.isSecureContext)throw Error('A câmera precisa de HTTPS ou localhost. Abra o jogo em uma conexão segura.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Este navegador não oferece acesso à câmera. A arena 3D continua disponível.');
  let cancelled=false;const request=navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960},aspectRatio:{ideal:4/3}},audio:false});
  let timer;
  try{this.stream=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{cancelled=true;reject(Error('A câmera não respondeu. Verifique a permissão e tente novamente.'));},20000)})]);}
  finally{clearTimeout(timer);request.then(s=>{if(cancelled||this.cancelled)s.getTracks().forEach(t=>t.stop())}).catch(()=>{});}
  if(this.cancelled){this.stream.getTracks().forEach(t=>t.stop());throw new DOMException('Abertura da câmera cancelada.','AbortError');}
  this.video=document.createElement('video');this.video.setAttribute('playsinline','');this.video.muted=true;this.video.autoplay=true;this.video.className='camera-feed';container.prepend(this.video);this.video.srcObject=this.stream;
  await this.video.play();if(!this.video.videoWidth)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Não foi possível iniciar o vídeo.')),10000);this.video.onloadedmetadata=()=>{clearTimeout(t);resolve()};});return this.video;
 }
 stop(){this.cancelled=true;this.stream?.getTracks().forEach(t=>t.stop());if(this.video){this.video.pause();this.video.srcObject=null;this.video.remove();}this.stream=null;this.video=null;}
}
