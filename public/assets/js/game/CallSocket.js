export class CallSocket{
 constructor(api,roomId,{onEvent=()=>{},onStatus=()=>{},onConfig=()=>{}}={}){Object.assign(this,{api,roomId,onEvent,onStatus,onConfig});this.socket=null;this.closed=false;this.retry=1000;this.timer=null;this.heartbeat=null;this.connect();}
 connected(){return this.socket?.readyState===WebSocket.OPEN;}
 async connect(){if(this.closed||!window.WebSocket)return;try{
  const auth=await this.api.request(`multiplayer/rooms/${this.roomId}/voice-token`);if(this.closed)return;this.onConfig(auth);if(!auth.enabled||!auth.token){this.onStatus(false);return;}
  const url=auth.url||`${location.protocol==='https:'?'wss':'ws'}://${location.hostname.includes(':')?'['+location.hostname+']':location.hostname}:${Number(auth.port)||8090}/`;
  this.socket=new WebSocket(url,['arcana-voice-v1',`auth.${auth.token}`]);
  this.socket.onopen=()=>{this.retry=1000;this.onStatus(true);this.heartbeat=setInterval(()=>this.send({type:'heartbeat'}),20000);};
  this.socket.onmessage=event=>{try{this.onEvent(JSON.parse(event.data));}catch{}};
  this.socket.onerror=()=>this.onStatus(false);
  this.socket.onclose=()=>{clearInterval(this.heartbeat);this.onStatus(false);if(!this.closed){this.timer=setTimeout(()=>this.connect(),this.retry);this.retry=Math.min(15000,Math.round(this.retry*1.8));}};
 }catch{this.onStatus(false);if(!this.closed){this.timer=setTimeout(()=>this.connect(),this.retry);this.retry=Math.min(15000,Math.round(this.retry*1.8));}}}
 send(message){if(!this.connected())return false;try{this.socket.send(JSON.stringify(message));return true;}catch{return false;}}
 close(){this.closed=true;clearTimeout(this.timer);clearInterval(this.heartbeat);this.socket?.close();}
}
