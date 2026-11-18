import {$,toast,modal,escape} from '../ui/HUDManager.js';
import {summonCard,summonReason,attackPreview} from './Combat.js';
export class BattleManager{
 constructor(api,arena,animation,hud,cardManager,onResult){Object.assign(this,{api,arena,animation,hud,cardManager,onResult});this.state=null;this.busy=false;}
 path(id){return (this.multiplayer?'multiplayer/rooms/':'battles/')+id;}
 async load(id){const s=await this.api.request(this.path(id));await this.setState(s);return s;}
 async setState(s){
  // Normalize MySQL identifiers before strict hand/selection comparisons.
  s.player.hand=s.player.hand.map(Number);
  if(s.catalog?.length){s.catalog=s.catalog.map(c=>({...c,id:Number(c.id),cost:Number(c.cost)}));this.cardManager.cards=s.catalog;this.animation.cards=s.catalog;}
  this.state=s;document.querySelector('#ar-begin-panel').hidden=true;
  const selected=summonCard(s,this.cardManager.cards,this.cardManager.selected);
  this.cardManager.selected=selected||this.cardManager.cards.find(c=>s.player.hand.includes(c.id))||null;
  this.cardManager.render(s.player.hand);this.update();
  await this.arena.sync(s,this.cardManager.cards);this.arena.arAdapter?.syncState?.(s);
 }
 update(){this.hud.update(this.state,this.cardManager.selected,this.user,this.busy,this.cardManager.cards);if(this.arena?.roomWaiting&&!this.state){$('#arena-caption').hidden=true;$('#opponent-name').textContent='Aguardando jogador';$('#turn-indicator').textContent='SALA ABERTA - AGUARDANDO JOGADOR';}}
 async action(action,data={}){
  if(this.busy||!this.state)return;this.busy=true;this.update();document.body.classList.add('busy');
  try{const s=await this.api.request(this.path(this.state.id)+'/'+action,{method:'POST',data:{...data,version:this.state.version}});try{await this.animation.play(s.events)}catch(e){console.warn('Animação interrompida:',e.message)}await this.setState(s);if(s.status==='finished')this.onResult(s);}
  catch(e){toast(e.message,true);if([0,409].includes(e.status)){try{await this.load(this.state.id);toast('Partida sincronizada. Você pode continuar.')}catch{}}}
  finally{this.busy=false;document.body.classList.remove('busy');this.update();}
 }
 summon(){
  const s=this.state,selected=this.cardManager.selected;
  const reason=summonReason(s,this.cardManager.cards,selected,this.busy);if(reason){toast(reason);return;}
  const card=summonCard(s,this.cardManager.cards,selected);
  if(card.id!==selected?.id)this.cardManager.select(card.id);
  return this.action('summon',{card_id:card.id});
 }
 chooseAttack(targetId=this.targetId){
  const s=this.state;if(!s||this.busy||s.status!=='active')return;
  if(s.active_side!=='player'){toast('Aguarde seu turno para atacar.');return;}
  const available=s.player.field.filter(m=>!m.attacked);
  if(!available.length){toast('Invoque uma criatura ou encerre o turno para atacar novamente.');return;}
  let attacker=available.find(m=>m.id===this.attackerId)||available[0];
  let target=s.ai.field.find(m=>m.id===targetId)||s.ai.field[0]||null;
  const choice=(m,enemy=false)=>'<button class="unit-choice attack-choice" data-unit="'+m.id+'"><strong>'+escape(m.name)+'</strong><span>'+m.attack+' ATK · '+m.defense+' DEF</span><small>'+m.hp+' / '+m.max_hp+' HP'+(enemy?'':' · Pronto para atacar')+'</small></button>';
  modal('Preparar ataque','<p class="form-note">Escolha sua criatura e o alvo. Cada criatura pode atacar uma vez por turno.</p><h3 class="field-label">Sua criatura</h3><div class="turn-choices" id="attacker-choices">'+available.map(m=>choice(m)).join('')+'</div><h3 class="field-label">Alvo adversário</h3><div class="turn-choices" id="target-choices">'+(s.ai.field.length?s.ai.field.map(m=>choice(m,true)).join(''):'<span class="unit-choice selected">'+escape(s.opponent_name||'Sentinela')+' · Ataque direto</span>')+'</div><p class="attack-preview" id="attack-preview" aria-live="polite"></p><button class="button button-gold" id="confirm-attack">Confirmar ataque →</button>');
  const mark=()=>{
   document.querySelectorAll('#attacker-choices button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.unit)===attacker.id));
   document.querySelectorAll('#target-choices button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.unit)===target?.id));
   const result=attackPreview(attacker,target,s.turn);
   $('#attack-preview').textContent=target?result.damage+' de dano em '+target.name+(result.defeated?' · Criatura será derrotada':' · Restarão '+Math.max(0,target.hp-result.damage)+' HP')+(result.direct?' · '+result.direct+' de dano direto':''):result.damage+' de dano direto nos pontos de vida do adversário.';
  };mark();
  document.querySelectorAll('#attacker-choices button').forEach(b=>b.onclick=()=>{attacker=available.find(m=>m.id===Number(b.dataset.unit));mark();});
  document.querySelectorAll('#target-choices button').forEach(b=>b.onclick=()=>{target=s.ai.field.find(m=>m.id===Number(b.dataset.unit));mark();});
  $('#confirm-attack').onclick=()=>{$('#modal').close();this.attackerId=attacker.id;this.targetId=target?.id;this.action('attack',{attacker_id:attacker.id,target_id:target?.id??null});};
 }
 pickUnit(unit){
  if(unit.side==='player'){this.attackerId=unit.id;toast(unit.name+(unit.attacked?' já atacou. Encerre o turno.':' selecionado. Toque em Atacar.'));this.update();}
  else{this.targetId=unit.id;if(this.state?.active_side==='player'&&this.state.player.field.some(m=>!m.attacked))this.chooseAttack(unit.id);else toast(unit.name+' · '+unit.hp+' HP · '+unit.defense+' DEF');}
 }
}
