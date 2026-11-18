// Shared UI decisions. The server remains authoritative for damage and turns.
export function summonCard(state,cards,selected){
 if(!state?.player?.hand)return null;
 const hand=state.player.hand.map(Number),energy=Number(state.player.energy);
 if(selected&&hand.includes(Number(selected.id))&&Number(selected.cost)<=energy)return selected;
 return hand.map(id=>cards.find(c=>Number(c.id)===id)).find(c=>c&&Number(c.cost)<=energy)||null;
}
export function summonReason(state,cards,selected,busy=false){
 if(!state)return 'Aguardando o outro jogador entrar.';
 if(state.status!=='active')return 'Duelo encerrado.';
 if(busy)return 'Confirmando movimento…';
 if(state.active_side!=='player')return 'Vez de '+(state.opponent_name||'seu adversário')+'. Aguarde ele encerrar o turno.';
 if(state.player.summoned)return 'Você já invocou neste turno. Ataque ou encerre o turno.';
 if(state.player.field.length>=3)return 'Seu campo tem três criaturas. Ataque para liberar espaço.';
 if(!summonCard(state,cards,selected))return 'Energia insuficiente. Encerre o turno para recuperá-la.';
 return '';
}
export function attackPreview(attacker,target,turn){
 const ability=attacker.ability||'';
 const attack=Math.max(0,attacker.attack-((attacker.weakened_until||0)>=turn?200:0))+(ability==='burn'?120:0);
 const defense=target?target.defense+(target.ability==='shield'?200:0):0;
 const damage=Math.max(100,attack-defense),overflow=target?Math.max(0,damage-target.hp):damage;
 return {damage,direct:overflow+(target&&ability==='pierce'?160:0),defeated:!!target&&damage>=target.hp};
}
