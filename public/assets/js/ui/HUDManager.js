import {summonReason} from '../game/Combat.js';
export const $=s=>document.querySelector(s);
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number=n=>Number(n).toLocaleString('pt-BR');
export function toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;$('#toasts').append(el);setTimeout(()=>el.remove(),6000);}
export function modal(title,content){$('#modal-title').textContent=title;$('#modal-content').innerHTML=content;if(!$('#modal').open)$('#modal').showModal();}
export class HUDManager{
 update(s,card,user,busy=false,cards=[]){
  $('#player-name').firstChild.textContent=(user?.name||'Você')+' ';
  $('#arena-caption').hidden=!!s;$('#field-labels').hidden=!s;
  if(!s){$('#summon-button').disabled=true;$('#attack-button').disabled=true;$('#end-turn-button').disabled=true;return;}
  for(const side of['player','ai'])this.hp(side,s[side].hp);
  $('#turn-indicator').innerHTML='<span class="live-dot"></span> '+(s.status==='finished'?'DUELO ENCERRADO':'TURNO '+s.turn+' · '+(s.active_side==='player'?'SUA VEZ':'VEZ DO ADVERSÁRIO'));
  const opponent=$('#opponent-name');if(opponent)opponent.textContent=s.multiplayer?s.opponent_name:'Sentinela';
  $('#energy-value').innerHTML=s.player.energy+' <small>/ '+s.player.max_energy+'</small>';
  $('#energy-crystals').innerHTML=Array.from({length:s.player.max_energy},(_,i)=>'<i class="'+(i>=s.player.energy?'spent':'')+'"></i>').join('');
  $('#deck-count').textContent=s.player.deck_count;
  $('#hand-count').textContent=s.player.hand.length+' cartas';
  const active=s.status==='active'&&s.active_side==='player'&&!busy;
  const reason=summonReason(s,cards,card,busy),summon=$('#summon-button');
  summon.disabled=!!reason;summon.title=reason||'Invocar uma carta da sua mão';
  const attack=$('#attack-button'),ready=s.player.field.some(m=>!m.attacked);
  // Keep attack tappable during an active duel so mobile players get a reason
  // when it is the opponent's turn or their creatures have already attacked.
  attack.disabled=s.status!=='active'||busy;
  attack.title=s.status!=='active'?'O duelo terminou.':busy?'Sincronizando movimento…':s.active_side!=='player'?'Aguarde sua vez.':!s.player.field.length?'Invoque uma criatura antes de atacar.':!ready?'Todas as suas criaturas já atacaram. Encerre o turno.':'Escolher criatura e alvo para atacar.';
  $('#end-turn-button').disabled=!active;
  $('#end-turn-button').classList.toggle('next-step',active&&s.player.summoned&&!s.player.field.some(m=>!m.attacked));
  $('#arena-tip').textContent=reason||(s.player.summoned?'Toque em uma criatura adversária para atacar ou em Atacar para usar a primeira criatura pronta.':'Sua vez: escolha uma carta e toque em Invocar.');
  const hint=$('#hand-hint');if(hint)hint.textContent=s.active_side==='player'?'Sua vez · 1 invocação e 1 ataque por criatura':(s.opponent_name||'Adversário')+' está jogando';

 }
 hp(side,value){$('#'+side+'-hp').innerHTML=number(value)+' <small>PV</small>';$('#'+side+'-life').style.width=(value/4000*100)+'%';}
 float(side,value,heal=false){const el=document.createElement('span');el.className='damage-float '+side+(heal?' heal':'');el.textContent=(heal?'+':'−')+number(value);$('#floating-effects').append(el);setTimeout(()=>el.remove(),1300);}
 log(event,cards){
  const opponent=$('#opponent-name')?.textContent||'Sentinela';
  const names={summon:()=>event.monster.name+' entrou no campo.',attack:()=>((cards.find(c=>c.id===event.card_id)?.name)||'Criatura')+' atacou: '+number(event.damage)+' de dano.',defeat:()=>((cards.find(c=>c.id===event.card_id)?.name)||'Criatura')+' foi derrotado.',turn:()=>event.side==='player'?'Seu turno começou.':'A Sentinela está jogando.',damage:()=>(event.side==='player'?'Você recebeu ':opponent+' recebeu ')+number(event.amount)+' de dano.',heal:()=>number(event.amount)+' pontos de vida recuperados.',regenerate:()=>'Raízes da vida restauraram a criatura.',fatigue:()=>'Deck vazio: '+number(event.amount)+' de dano de fadiga.',victory:()=>event.side==='player'?'Vitória! O duelo é seu.':opponent+' venceu este duelo.',draw:()=>'Você comprou uma carta.',discard:()=>'Mão cheia: a carta comprada foi descartada.'};
  if(!names[event.type]||(event.type==='draw'&&event.side==='ai'))return;
  const li=document.createElement('li');li.innerHTML='<span class="log-symbol">'+(event.type==='attack'?'⚔':'✧')+'</span><div>'+escape(names[event.type]())+'<small>Turno '+event.turn+' · '+(event.side==='player'?'Você':event.side==='ai'?opponent:'Arena')+'</small></div>';$('#battle-log').prepend(li);while($('#battle-log').children.length>35)$('#battle-log').lastChild.remove();
 }
}
