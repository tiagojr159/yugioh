import {$,toast,modal,escape} from '../ui/HUDManager.js';
export class BattleManager{
 constructor(api,arena,animation,hud,cardManager,onResult){Object.assign(this,{api,arena,animation,hud,cardManager,onResult});this.state=null;this.busy=false;}
 path(id){return (this.multiplayer?'multiplayer/rooms/':'battles/')+id;}
 async load(id){const s=await this.api.request(this.path(id));await this.setState(s);return s;}
 async setState(s){this.state=s;document.querySelector('#ar-begin-panel').hidden=true;if(s.catalog?.length){this.cardManager.cards=s.catalog;this.animation.cards=s.catalog;}await this.arena.sync(s,this.cardManager.cards);this.arena.arAdapter?.syncState?.(s);if(s.player.hand.length){const selectedInHand=s.player.hand.includes(this.cardManager.selected?.id),selectedAffordable=selectedInHand&&this.cardManager.selected.cost<=s.player.energy;if(!selectedAffordable){const affordable=s.player.hand.map(id=>this.cardManager.cards.find(c=>c.id===id)).find(c=>c&&c.cost<=s.player.energy);if(affordable)this.cardManager.selected=affordable;else if(!selectedInHand)this.cardManager.selected=this.cardManager.cards.find(c=>c.id===s.player.hand[0]);}}this.cardManager.render(s.player.hand);this.update();}
 update(){this.hud.update(this.state,this.cardManager.selected,this.user,this.busy);}
 async action(action,data={}){
  if(this.busy||!this.state)return;this.busy=true;this.update();document.body.classList.add('busy');
  try{const s=await this.api.request(this.path(this.state.id)+'/'+action,{method:'POST',data:{...data,version:this.state.version}});try{await this.animation.play(s.events)}catch(e){console.warn('Animação interrompida:',e.message)}await this.setState(s);if(s.status==='finished')this.onResult(s);}
  catch(e){toast(e.message,true);if([0,409].includes(e.status)){try{await this.load(this.state.id);toast('Partida sincronizada. Você pode continuar.')}catch{}}}
  finally{this.busy=false;document.body.classList.remove('busy');this.update();}
 }
 summon(){return this.action('summon',{card_id:this.cardManager.selected.id});}
 chooseAttack(){
  if(!this.state||this.busy)return;const available=this.state.player.field.filter(m=>!m.attacked);if(!available.length)return;
  let attacker=available.find(m=>m.id===this.attackerId)?.id||available[0].id,target=this.state.ai.field[0]?.id||null;
  modal('Escolha seu ataque','<p class="form-note">Cada criatura pode atacar uma vez por turno. Sem criaturas no campo adversário, o ataque é direto.</p><h3 class="field-label">Sua criatura</h3><div class="turn-choices" id="attacker-choices">'+available.map(m=>'<button class="unit-choice" data-unit="'+m.id+'">'+escape(m.name)+'<br>'+m.attack+' ATK · '+m.hp+' HP</button>').join('')+'</div><h3 class="field-label">Alvo adversário</h3><div class="turn-choices" id="target-choices">'+(this.state.ai.field.length?this.state.ai.field.map(m=>'<button class="unit-choice" data-unit="'+m.id+'">'+escape(m.name)+'<br>'+m.defense+' DEF · '+m.hp+' HP</button>').join(''):'<span class="unit-choice selected">Sentinela · Ataque direto</span>')+'</div><button class="button button-gold" id="confirm-attack">Confirmar ataque →</button>');
  const mark=()=>{document.querySelectorAll('#attacker-choices button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.unit)===attacker));document.querySelectorAll('#target-choices button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.unit)===target));};mark();document.querySelectorAll('#attacker-choices button').forEach(b=>b.onclick=()=>{attacker=Number(b.dataset.unit);mark()});document.querySelectorAll('#target-choices button').forEach(b=>b.onclick=()=>{target=Number(b.dataset.unit);mark()});$('#confirm-attack').onclick=()=>{$('#modal').close();this.action('attack',{attacker_id:attacker,target_id:target})};
 }
 pickUnit(unit){if(unit.side==='player'){this.attackerId=unit.id;this.cardManager.select(unit.card_id);toast(unit.name+(unit.attacked?' já atacou neste turno.':' selecionado. Toque em Atacar.'));}else{this.cardManager.select(unit.card_id);toast(unit.name+' · '+unit.hp+' HP · '+unit.defense+' DEF');}}
}
