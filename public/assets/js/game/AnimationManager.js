import * as THREE from 'three';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export class AnimationManager{
 constructor(arena,hud,cards){this.arena=arena;this.hud=hud;this.cards=cards;this.sound=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}
 enableSound(value){this.sound=value;if(value){this.audio??=new(window.AudioContext||window.webkitAudioContext)();this.audio.resume();}}
 tone(type){if(!this.sound||!this.audio)return;const tones={summon:[330,660,'sine'],attack:[130,45,'sawtooth'],turn:[440,550,'sine'],victory:[440,880,'sine'],defeat:[200,80,'triangle']};const [start,end,wave]=tones[type]||tones.attack,t=this.audio.currentTime,osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type=wave;osc.frequency.setValueAtTime(start,t);osc.frequency.exponentialRampToValueAtTime(end,t+.2);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.3);osc.connect(gain).connect(this.audio.destination);osc.start(t);osc.stop(t+.32);}
 async tween(duration,update){
  if(this.reduced||document.hidden){update(1);return;}
  const start=performance.now();await new Promise(resolve=>{
   let done=false,raf,timer;
   const step=()=>{if(done)return;const p=document.hidden?1:Math.min(1,(performance.now()-start)/duration);update(p);if(p>=1){done=true;cancelAnimationFrame(raf);clearTimeout(timer);resolve();}else raf=requestAnimationFrame(step);};
   // rAF pauses when switching to WhatsApp; never leave game controls locked.
   timer=setTimeout(()=>{if(!done){done=true;cancelAnimationFrame(raf);update(1);resolve();}},duration+150);step();
  });
 }
 async play(events){for(const e of events){this.hud.log(e,this.cards);
  if(e.type==='summon'){await this.arena.addEventMonster(e);const root=this.arena.getUnitRoot(e.monster.id);if(root){this.arena.monsters.play(root,'summon');const scale=root.scale.x;this.arena.burst(root.position,this.cards.find(c=>c.id===e.card_id)?.color,root.parent);await this.tween(450,p=>root.scale.setScalar(Math.max(.001,p*scale)));}this.tone('summon');}
  if(e.type==='attack'){this.tone('attack');const root=this.arena.getUnitRoot(e.attacker_id),target=this.arena.getUnitRoot(e.target_id);if(root){this.arena.monsters.play(root,'attack');const base=root.position.clone(),direction=target?target.position.clone().sub(base).normalize():new THREE.Vector3(0,0,e.side==='player'?-1:1);await this.tween(400,p=>root.position.copy(base).addScaledVector(direction,Math.sin(p*Math.PI)*.65));}if(target){this.arena.monsters.play(target,'hit');this.arena.burst(target.position.clone().add(new THREE.Vector3(0,.9,0)),'#eab78b',target.parent);const base=target.position.clone();await this.tween(180,p=>{target.position.x=base.x+Math.sin(p*Math.PI*6)*(1-p)*.12});target.position.copy(base);}this.hud.float(e.side==='player'?'ai':'player',e.damage);}
  if(e.type==='damage'||e.type==='fatigue')this.hud.hp(e.side,e.hp);
  if(e.type==='heal'){this.hud.hp(e.side,e.hp);this.hud.float(e.side,e.amount,true);}
  if(e.type==='defeat'){this.tone('defeat');const root=this.arena.getUnitRoot(e.monster_id);if(root){const scale=root.scale.x;this.arena.monsters.play(root,'defeat');await this.tween(260,p=>root.scale.setScalar(Math.max(.001,(1-p)*scale)));this.arena.removeUnit(e.monster_id);}}
  if(e.type==='turn'&&e.side==='ai'){document.querySelector('#turn-indicator').textContent='TURNO '+e.turn+' · '+(this.arena.battleState?.opponent_name||'SENTINELA');await wait(this.reduced?0:300);}
  if(e.type==='turn')this.tone('turn');
  if(e.type==='victory'){this.tone('victory');this.arena.burst(new THREE.Vector3(0,2,0),e.side==='player'?'#e5d18c':'#bda4df');}
 }}
}
