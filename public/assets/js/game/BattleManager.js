import {$,toast} from '../ui/HUDManager.js';
import {summonCard,summonReason} from './Combat.js';
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
 chooseAttack(targetId=this.targetId,gestureAttackerId=null){
  const s=this.state;if(!s||this.busy||s.status!=='active')return;
  if(s.active_side!=='player'){toast('Aguarde seu turno para atacar.');return;}
  const available=s.player.field.filter(m=>!m.attacked);
  const gestureAttacker=gestureAttackerId===null?null:
   available.find(m=>Number(m.id)===Number(gestureAttackerId));
  if(gestureAttackerId!==null&&!gestureAttacker){
   toast('Essa criatura não pode atacar neste turno.');
   return;
  }
  if(!available.length){toast(s.player.field.length?'Todas as suas criaturas já atacaram. Encerre o turno para atacar novamente.':'Invoque uma criatura antes de atacar.');return;}
  const attacker=gestureAttacker||available.find(m=>Number(m.id)===Number(this.attackerId))||available[0];
  const target=s.ai.field.find(m=>Number(m.id)===Number(targetId))||s.ai.field[0]||null;
  this.attackerId=attacker.id;this.targetId=target?.id;
  toast(target?attacker.name+' atacando '+target.name+'.':attacker.name+' atacando diretamente os pontos de vida adversários.');
  return this.action('attack',{attacker_id:attacker.id,target_id:target?.id??null});
 }
 pickUnit(unit){
  if(unit.side==='player'){this.attackerId=unit.id;toast(unit.name+(unit.attacked?' já atacou. Encerre o turno.':' selecionado. Toque em Atacar.'));this.update();}
  else{this.targetId=unit.id;if(this.state?.active_side==='player'&&this.state.player.field.some(m=>!m.attacked))this.chooseAttack(unit.id);else toast(unit.name+' · '+unit.hp+' HP · '+unit.defense+' DEF');}
 }
}
