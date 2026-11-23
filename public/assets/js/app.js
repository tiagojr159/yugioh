
import {Api} from './Api.js?v=20261122-36';
import {$,escape,number,toast,modal,HUDManager} from './ui/HUDManager.js?v=20261122-36';
import {ArenaRenderer} from './game/ArenaRenderer.js?v=20261122-38';
import {CardManager} from './game/CardManager.js';
import {AnimationManager} from './game/AnimationManager.js?v=20261122-36';
import {BattleManager} from './game/BattleManager.js?v=20261122-38';
import {Multiplayer} from './game/Multiplayer.js?v=20261122-36';
import {VoiceCall} from './game/VoiceCall.js?v=20261122-36';
import {ARManager} from './ar/ARManager.js?v=20261122-38';
import {TouchControls} from './ui/TouchControls.js';
import {HandGestureController} from './game/HandGestureController.js?v=20261122-41';
const api=new Api(),hud=new HUDManager();let cards=[],user=null,arena,ar,cardManager,animation,battle,multiplayer,voice,handGestures=null,activeBattle=null,deckId=null;
const storage={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
const sessionSetting={get:k=>{try{return sessionStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}}};
const close=()=>$('#modal').close();$('#modal-close').onclick=close;$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
const touch=new TouchControls();
// Navegadores móveis só permitem iniciar áudio após uma interação do usuário.
document.addEventListener('pointerdown',()=>{if(animation&&!animation.sound&&storage.get('arcana_sound')!=='off'){try{animation.enableSound(true)}catch{}}},{passive:true});
function accountLabel(){ $('#account-button span').textContent=user?(user.is_guest?'Visitante':user.name.split(' ')[0]):'Entrar';if(battle){battle.user=user;battle.update();} }
async function ensureUser(){if(!user){user=await api.request('auth/guest',{method:'POST',data:{}});accountLabel();}return user;}
async function startBattle(){if(!battle||battle.busy)return;const button=$('#start-battle');button.disabled=true;button.textContent='Preparando duelo…';try{if(multiplayer?.room){toast('Voce esta em uma sala multiplayer. Aguarde o outro jogador.');return;}await ensureUser();battle.multiplayer=false;const decks=await api.request('decks');if(!decks.length)throw Error('Monte um deck antes de começar.');const selected=decks.find(d=>d.id===deckId)||decks[0];const s=activeBattle?await api.request('battles/'+activeBattle):await api.request('battles',{method:'POST',data:{deck_id:selected.id}});await battle.setState(s);activeBattle=s.id;$('#battle-log').innerHTML='';hud.log({type:'turn',side:'player',turn:s.turn},cards);toast('Duelo iniciado. Escolha uma carta e invoque sua criatura.');}catch(e){toast(e.message,true);}finally{button.disabled=false;button.textContent='Iniciar duelo →';}}
async function resetLobby(){document.body.classList.remove('multiplayer-waiting');activeBattle=null;if(!battle)return;battle.state=null;battle.multiplayer=false;if(multiplayer){multiplayer.room=null;storage.set('arcana_multiplayer_room','');}voice?.disconnect();arena.roomWaiting=false;arena.setOpponentVisible?.(true);arena.battleState=null;arena.arAdapter?.syncState?.(null);if(ar?.mode!=='3d')$('#ar-begin-panel').hidden=false;cardManager.cards=cards;$('#opponent-name').textContent='Sentinela';$('#arena-caption').hidden=false;$('#field-labels').hidden=true;$('#turn-indicator').innerHTML='<span class="live-dot"></span> PREPARE SEU DECK';hud.hp('player',4000);hud.hp('ai',4000);cardManager.render();await arena.preview(cards);battle.update();}
function authForm(register=false){
 modal(register?'Crie sua conta':'Bem-vindo à arena','<form class="form" id="auth-form">'+(register?'<label>Nome do duelista<input name="name" autocomplete="nickname" minlength="2" maxlength="60" required></label>':'')+'<label>E-mail<input name="email" type="email" autocomplete="email" maxlength="190" required></label><label>Senha<input name="password" type="password" autocomplete="'+(register?'new-password':'current-password')+'" minlength="'+(register?'3':'1')+'" maxlength="128" required></label>'+(register?'<p class="form-note">Use pelo menos 3 caracteres; pode ser só números.</p>':'')+'<p class="form-error" id="auth-error" role="alert"></p><button class="button button-gold" type="submit">'+(register?'Criar conta e receber 18 cartas':'Entrar na minha conta')+' →</button><button type="button" class="form-switch" id="auth-switch">'+(register?'Já tenho uma conta':'Criar uma conta gratuita')+'</button></form><div class="modal-divider"><button class="button button-end" id="play-guest">Continuar como visitante</button><p class="form-note" style="margin-top:10px">Visitantes também recebem o deck inicial. A conta permite acessar seu progresso em outros dispositivos.</p></div>');
 $('#auth-switch').onclick=()=>authForm(!register);$('#play-guest').onclick=async()=>{try{await ensureUser();close();await startBattle()}catch(e){toast(e.message,true)}};
 $('#auth-form').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;$('#auth-error').textContent='';try{const data=Object.fromEntries(new FormData(e.currentTarget));user=await api.request('auth/'+(register?'register':'login'),{method:'POST',data});const session=await api.session();activeBattle=session.active_battle;accountLabel();close();if(activeBattle)await battle.load(activeBattle);else await resetLobby();toast('Bem-vindo, '+user.name+'. Seu deck está pronto.');}catch(error){$('#auth-error').textContent=error.message;}finally{button.disabled=false;}};
}
async function showAccount(){if(!user)return authForm();try{const stats=await api.request('players/me/statistics');modal('Seu perfil','<div class="modal-copy"><h3>'+escape(user.name)+(user.is_guest?' · Visitante':'')+'</h3><p>'+stats.battles+' duelos · '+stats.wins+' vitórias · '+stats.losses+' derrotas</p><p>'+number(stats.experience)+' XP · '+number(stats.damage_dealt)+' de dano causado</p>'+(user.role==='admin'?'<p><a href="admin">Abrir painel administrativo →</a></p>':'')+'</div><div class="modal-divider">'+(user.is_guest?'<button class="button button-gold" id="profile-register">Criar uma conta</button>':'')+' <button class="button button-end" id="logout">Sair da conta</button></div>');$('#profile-register')?.addEventListener('click',()=>authForm(true));$('#logout').onclick=async()=>{try{const result=await api.request('auth/logout',{method:'POST',data:{}});api.csrf=result.csrf;user=null;accountLabel();close();await resetLobby();}catch(e){toast(e.message,true)}};}catch(e){toast(e.message,true)}}
function collection(){if(!cardManager)return;modal('Os seis reinos','<p class="form-note" style="margin-bottom:18px">Explore suas criaturas. Toque em uma carta para ver atributos e habilidade.</p><div class="collection-grid">'+cards.map(c=>cardManager.template(c)).join('')+'</div><div class="modal-divider"><a class="text-button" href="markers" target="_blank" rel="noopener">Imprimir cartas com marcadores AR ↗</a></div>');document.querySelectorAll('#modal-content [data-card]').forEach(el=>el.onclick=()=>{cardManager.select(Number(el.dataset.card));modal(cardManager.selected.name,cardManager.detailHTML()+'<button class="text-button" id="back-collection">← Voltar à coleção</button>');$('#back-collection').onclick=collection;});}
async function decks(){try{await ensureUser();const list=await api.request('decks');modal('Seus decks','<p class="form-note">De 12 a 30 cartas, até três cópias de cada. Seu deck inicial já está pronto para jogar.</p><div>'+list.map(d=>'<div class="deck-row"><img src="'+escape(cards[0].image_url)+'" alt=""><div>'+escape(d.name)+'<small>'+d.count+' cartas'+(deckId===d.id?' · Selecionado':'')+'</small></div><button class="button button-end" data-edit="'+d.id+'">Editar</button><button class="button button-gold" data-use="'+d.id+'">Usar</button></div>').join('')+'</div><button class="text-button" id="new-deck">+ Criar novo deck</button>');document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{deckId=Number(b.dataset.use);toast('Deck selecionado para o próximo duelo.');close()});document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editDeck(list.find(d=>d.id===Number(b.dataset.edit))));$('#new-deck').onclick=()=>editDeck(null);}catch(e){toast(e.message,true)}}
async function editDeck(deck){const owned=await api.request('players/me/collection');modal(deck?'Editar deck':'Novo deck','<form class="form" id="deck-form"><label>Nome do deck<input name="name" maxlength="60" minlength="2" required value="'+escape(deck?.name||'Meu novo deck')+'"></label><div>'+cards.filter(c=>owned.some(o=>Number(o.card_id)===c.id)).map(c=>'<label class="deck-row"><img src="'+escape(c.image_url)+'" alt=""><div>'+escape(c.name)+'<small>'+c.cost+' energia · '+c.attack+' ATK</small></div><input aria-label="Quantidade de '+escape(c.name)+'" type="number" min="0" max="'+Math.min(3,Number(owned.find(o=>Number(o.card_id)===c.id)?.quantity||0))+'" name="card_'+c.id+'" value="'+(deck?.cards.find(d=>d.card_id===c.id)?.quantity||0)+'"></label>').join('')+'</div><p class="form-error" id="deck-error"></p><button class="button button-gold" type="submit">Salvar deck →</button></form>');$('#deck-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),selected=cards.map(c=>({card_id:c.id,quantity:Number(f.get('card_'+c.id))})).filter(c=>c.quantity>0);try{const saved=await api.request('decks'+(deck?'/'+deck.id:''),{method:deck?'PUT':'POST',data:{name:f.get('name'),cards:selected}});deckId=saved.id;toast('Deck salvo e selecionado.');decks();}catch(error){$('#deck-error').textContent=error.message;}};}
function help(){modal('Seu primeiro duelo','<div class="modal-copy"><p>Você e a Sentinela começam com <strong>4.000 pontos de vida</strong>. Reduza a vida adversária a zero para vencer.</p><ol><li><strong>Escolha sua carta.</strong> Sua mão inicial tem cinco cartas. Você recebe energia renovada a cada turno.</li><li><strong>Invoque.</strong> Uma criatura por turno, pagando o custo de energia. Você pode manter até três no campo.</li><li><strong>Ataque.</strong> Cada criatura pode atacar uma vez por turno, inclusive no turno da invocação. Escolha o atacante e o alvo.</li><li><strong>Encerre seu turno.</strong> A Sentinela invoca e ataca. Depois você compra uma carta e recupera energia.</li></ol><h3>Como o dano funciona</h3><p>ATK − DEF do alvo, com mínimo de 100. O dano reduz o HP da criatura; o excedente atinge o jogador. Sem criaturas adversárias, o ataque é direto. As habilidades alteram esse cálculo.</p><h3>E se o deck acabar?</h3><p>A fadiga causa 200 de dano no primeiro turno sem cartas, depois 400, 600 e assim por diante. Após 80 turnos, vence quem tiver mais vida; em empate, a Sentinela vence.</p><h3>Jogue no seu mundo</h3><p>Abra as configurações para escolher AR por superfícies ou por marcadores. A câmera traseira só é ativada com sua autorização. No celular, use HTTPS.</p><a href="markers" target="_blank" rel="noopener">Imprimir marcadores →</a></div>');}
async function settings(){
 const caps=ar?await ar.capabilities():{webxr:false,marker:false,secure:window.isSecureContext};modal('A arena do seu jeito','<p class="form-note">Escolha como suas criaturas entram no mundo.</p><div class="mode-choices"><button class="mode-choice '+(ar?.mode==='3d'?'selected':'')+'" data-mode="3d"><span>◇</span><strong>Arena 3D</strong><small>Explore com toque ou mouse. Disponível sem câmera.</small></button><button class="mode-choice" data-mode="webxr" '+(!caps.webxr?'disabled':'')+'><span>⌖</span><strong>AR · Superfície</strong><small>'+(caps.webxr?'Posicione o tabuleiro sobre uma mesa.':'WebXR imersivo indisponível neste navegador.')+'</small></button><button class="mode-choice" data-mode="marker" '+(!caps.marker?'disabled':'')+'><span>▧</span><strong>AR · Marcadores</strong><small>'+(caps.marker?'Aponte para uma carta impressa.':caps.secure?'Câmera indisponível.':'Disponível em HTTPS ou localhost.')+'</small></button></div><p class="form-note"><a href="markers" target="_blank" rel="noopener">Imprimir seis marcadores ↗</a></p><div class="settings-option"><div><p>Qualidade gráfica</p><small>Automático se adapta ao desempenho do aparelho.</small></div><select id="quality" aria-label="Qualidade gráfica"><option value="auto">Automático</option><option value="low">Econômico</option><option value="high">Alta</option></select></div><div class="settings-option"><div><p>Efeitos sonoros</p><small>Áudio sintetizado no seu dispositivo.</small></div><select id="sound" aria-label="Efeitos sonoros"><option value="off">Desativados</option><option value="on">Ativados</option></select></div>'+(battle?.state?.status==='active'?'<div class="modal-divider"><button class="text-button" id="sync">Sincronizar partida</button><button class="text-button" id="surrender" style="float:right;color:#d5a18e">Desistir do duelo</button></div>':''));
 $('#quality').value=arena?.quality||'auto';$('#quality').onchange=e=>{arena?.setQuality(e.target.value);storage.set('arcana_quality',e.target.value)};$('#sound').value=animation?.sound?'on':'off';$('#sound').onchange=e=>{try{animation?.enableSound(e.target.value==='on');storage.set('arcana_sound',e.target.value)}catch{toast('Áudio indisponível neste navegador.',true)}};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{close();ar?.setMode(b.dataset.mode)});$('#sync')?.addEventListener('click',async()=>{close();try{await battle.load(battle.state.id);toast('Partida sincronizada.')}catch(e){toast(e.message,true)}});$('#surrender')?.addEventListener('click',()=>{modal('Desistir do duelo?','<p class="modal-copy">A Sentinela será a vencedora e o resultado será salvo no seu perfil.</p><button class="button button-attack" id="confirm-surrender">Desistir e encerrar</button>');$('#confirm-surrender').onclick=()=>{close();battle.action('surrender')}});
}
function result(s){activeBattle=null;const won=s.winner==='player';if(s.multiplayer){if(multiplayer){multiplayer.room=null;storage.set('arcana_multiplayer_room','');}modal(won?'Vitória conquistada':'O duelo terminou','<div class="result-content"><h3>'+(won?'Você venceu o duelo!':'Seu adversário venceu o duelo.')+'</h3><p>'+s.turn+' turnos</p><button class="button button-gold" id="play-again">Voltar à arena</button></div>');$('#play-again').onclick=async()=>{close();await resetLobby()};return;}modal(won?'Vitória conquistada':'O duelo terminou','<div class="result-content"><div class="result-sigil">'+(won?'✧':'◇')+'</div><h3>'+ (won?'A arena é sua.':'Uma nova estratégia espera.')+'</h3><p>'+ (won?'Você superou a Sentinela e conquistou 250 XP.':'A Sentinela venceu desta vez. Você recebeu 75 XP.')+'<br>'+s.turn+' turnos · '+number(s.damage_dealt)+' de dano causado</p><button class="button button-gold" id="play-again">Jogar novamente →</button></div>');$('#play-again').onclick=async()=>{close();await resetLobby();startBattle()};}
async function init(){
 try{const [catalog,session]=await Promise.all([api.request('cards'),api.session()]);cards=catalog;user=session.user;activeBattle=session.active_battle;if(!cards.length)throw Error('O catálogo está vazio. Execute as migrations e o seeder.');
  arena=new ArenaRenderer($('#scene'),unit=>battle?.pickUnit(unit));cardManager=new CardManager(cards,()=>battle?.update());animation=new AnimationManager(arena,hud,cards);battle=new BattleManager(api,arena,animation,hud,cardManager,result);ar=new ARManager(arena,cards,card=>cardManager.select(card.id),toast);voice=new VoiceCall(api);window.arcanaVoice=voice;multiplayer=new Multiplayer({api,ensureUser,getUser:()=>user,getDeck:()=>deckId,getBattle:()=>battle,onJoined:()=>{activeBattle=null},onResult:result});multiplayer.onEnterRoom=()=>ar.openRoom();multiplayer.start();$('#waiting-room-camera').onclick=()=>ar.startPreferred();$('#online-players').onclick=()=>multiplayer.open();$('#create-room-hero').onclick=()=>multiplayer.create();cardManager.render();await arena.preview(cards);await arena.buildStereoEnvironment(cards);ar.capabilities();arena.setQuality(storage.get('arcana_quality')||'auto');accountLabel();$('#connection span').textContent='Servidor conectado';
  const stereoToggle=$('#stereo-toggle'),stereoExit=$('#stereo-exit'),stereoMotion=$('#stereo-motion');
  const gestureToggle=$('#gesture-toggle'),gestureCamera=$('#gesture-camera');
  const gestureDeck=$('#gesture-deck');
  const renderGestureDeck=()=>{
   gestureDeck.hidden=!(arena.stereoEnabled||handGestures.running);
   if(gestureDeck.hidden)return;
   const state=battle.state;
   const hand=state?.status==='active'?state.player.hand:[];
   const views=arena.stereoEnabled?2:1;
   const signature=JSON.stringify([views,state?.id,state?.status,hand,battle.busy,!!multiplayer.room]);
   if(gestureDeck.dataset.rendered===signature)return;
   gestureDeck.dataset.rendered=signature;
   const row=document.createElement('div');
   row.className='gesture-deck-eye';
   if(!state||state.status==='finished'){
    const start=document.createElement('button');
    start.type='button';
    start.dataset.gestureStart='';
    start.textContent=multiplayer.room?'Aguardando duelo':'Iniciar duelo';
    start.disabled=!!multiplayer.room;
    row.append(start);
   }else{
    for(const id of hand){
     const card=cardManager.cards.find(entry=>Number(entry.id)===Number(id));
     if(!card)continue;
     const button=document.createElement('button');
     button.type='button';
     button.dataset.gestureCard=card.id;
     button.dataset.cardName=card.name;
     button.setAttribute('aria-label','Invocar '+card.name+' por '+card.cost+' de energia');
     button.disabled=battle.busy;
     const image=document.createElement('img');
     image.src=card.image_url;
     image.alt='';
     const title=document.createElement('span');
     title.textContent=card.name;
     const cost=document.createElement('small');
     cost.textContent=card.cost+' ◈';
     button.append(image,title,cost);
     row.append(button);
    }
   }
   gestureDeck.replaceChildren(row);
   if(views===2){
    const otherEye=row.cloneNode(true);
    otherEye.setAttribute('aria-hidden','true');
    for(const button of otherEye.querySelectorAll('button'))button.tabIndex=-1;
    gestureDeck.append(otherEye);
   }
  };
  gestureDeck.onclick=event=>{
   const button=event.target.closest('button');
   if(!button||button.disabled)return;
   if(button.hasAttribute('data-gesture-start'))startBattle();
   else if(arena.stereoEnabled)battle.summon(Number(button.dataset.gestureCard));
   else cardManager.select(Number(button.dataset.gestureCard));
  };
  const gestureCardAt=({x,y})=>{
   if(gestureDeck.hidden)return null;
   const rect=$('#arena-viewport').getBoundingClientRect();
   const clientX=rect.left+x*rect.width/(arena.stereoEnabled?2:1);
   const clientY=rect.top+y*rect.height;
   for(const button of gestureDeck.firstElementChild?.querySelectorAll('[data-gesture-card]')||[]){
    const bounds=button.getBoundingClientRect();
    if(clientX>=bounds.left&&clientX<=bounds.right&&clientY>=bounds.top&&clientY<=bounds.bottom){
     return {kind:'card',id:Number(button.dataset.gestureCard),name:button.dataset.cardName};
    }
   }
   return null;
  };
  handGestures=new HandGestureController({
   container:$('#arena-viewport'),
   status:$('#hand-status'),
   arena,
   cardAt:gestureCardAt,
   onSummon:cardId=>battle.summon(cardId),
   onAttack:attackerId=>{
    if(!battle.state){toast('Inicie um duelo antes de atacar com gestos.',true);return;}
    return battle.chooseAttack(undefined,attackerId);
   },
   onStop:()=>{
    gestureToggle.textContent='Ligar câmera e gestos';
    gestureToggle.setAttribute('aria-pressed','false');
    gestureCamera.hidden=true;
    renderGestureDeck();
   }
  });
  battle.onUpdate=renderGestureDeck;
  ar.onBeforeCamera=()=>handGestures.stop();
  gestureToggle.hidden=false;
  const startGestures=async(facingMode)=>{
   if(ar.mode!=='3d'||ar.switching){toast('Volte à Arena 3D para usar os gestos.',true);return;}
   gestureToggle.textContent='Cancelar gestos';
   try{
    if(await handGestures.start(facingMode)){
     gestureToggle.textContent='Câmera ligada · desligar';
     gestureToggle.setAttribute('aria-pressed','true');
     gestureCamera.hidden=false;
     gestureCamera.textContent=handGestures.mirrored?'Usar traseira':'Usar frontal';
     renderGestureDeck();
    }
   }catch(error){toast(error.message,true);}
  };
  gestureToggle.onclick=()=>{
   if(handGestures.operation)handGestures.stop();
   else startGestures();
  };
  gestureCamera.onclick=()=>{
   const facingMode=handGestures.mirrored?'environment':'user';
   handGestures.stop();
   startGestures(facingMode);
  };
  const updateStereoButton=enabled=>{
   stereoToggle.setAttribute('aria-pressed',String(enabled));
   $('#stereo-state').textContent=enabled?'Sim':'Não';
   stereoExit.hidden=!enabled;
   stereoMotion.hidden=!enabled;
   document.body.classList.toggle('stereo-mode',enabled);
   handGestures.resetAim();
   arena.setStereoEnabled(enabled);
   renderGestureDeck();
  };
  updateStereoButton(sessionSetting.get('arcana_stereo')==='on');
  stereoToggle.onclick=()=>{
   const enabled=!arena.stereoEnabled;
   if(enabled&&ar.mode!=='3d'){toast('Volte à Arena 3D para usar o modo Óculos 3D.',true);return;}
   sessionSetting.set('arcana_stereo',enabled?'on':'off');
   updateStereoButton(enabled);
   if(enabled&&document.fullscreenEnabled&&!document.fullscreenElement){
    document.body.requestFullscreen?.().then(()=>screen.orientation?.lock?.('landscape').catch(()=>{})).catch(()=>{});
   }else if(!enabled&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
  };
  stereoExit.onclick=()=>stereoToggle.click();
  stereoMotion.onclick=async()=>{if(arena.headTracking){arena.disableHeadTracking();stereoMotion.textContent='Ativar giro do celular';return;}try{const ready=await arena.enableHeadTracking();if(ready)stereoMotion.textContent='Giro do celular ativado';else toast('O sensor de movimento n\u00e3o est\u00e1 dispon\u00edvel ou n\u00e3o recebeu permiss\u00e3o neste aparelho.',true);}catch{toast('N\u00e3o foi poss\u00edvel ativar o sensor de movimento.',true);}};
  $('#start-battle').onclick=startBattle;$('#ar-start-battle').onclick=startBattle;$('#launch-ar').onclick=async()=>{const button=$('#launch-ar');button.disabled=true;try{await ar.startPreferred();}finally{button.disabled=false;}};$('#exit-ar').onclick=()=>ar.setMode('3d');$('#ar-reposition').onclick=()=>ar.reposition();
  ar.capabilities().then(c=>{$('#ar-availability').textContent=c.webxr?'Seu aparelho pode posicionar o duelo direto sobre a mesa.':c.marker?'No Android e no iPhone: mostre uma carta AR impressa ou aberta em outra tela.':'A câmera exige HTTPS no celular. A arena abaixo permite explorar as criaturas.';});$('#summon-button').onclick=()=>battle.summon();$('#attack-button').onclick=()=>battle.chooseAttack();$('#end-turn-button').onclick=()=>battle.action('end-turn');$('#reset-camera').onclick=()=>{if(ar.mode==='3d')arena.resetCamera();else ar.setMode('3d');};
  if(activeBattle&&!location.hash.startsWith('#sala=')&&!storage.get('arcana_multiplayer_room')){await battle.load(activeBattle);toast('Seu duelo foi retomado do último movimento salvo.');}
  const joinedFromInvite=await multiplayer.fromLink();if(joinedFromInvite){$('#duel-room-screen').hidden=true;$('#waiting-room-banner').hidden=false;await ar.openRoom();}else if(!multiplayer.room)multiplayer.restore();
 }catch(e){$('#connection').classList.add('offline');$('#connection span').textContent='Servidor indisponível';$('#arena-caption h3').textContent='Vamos preparar a arena.';$('#arena-caption p').textContent=e.message;$('#start-battle').textContent='Tentar novamente';$('#start-battle').onclick=()=>location.reload();$('#launch-ar').onclick=()=>toast('Primeiro conclua a instalação do servidor indicada no README.',true);toast(e.message,true);console.error(e);}
}
$('#account-button').onclick=showAccount;$('#nav-arena').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>({collection,decks,help,settings}[el.dataset.open]?.()));
window.addEventListener('online',async()=>{try{await api.session();$('#connection').classList.remove('offline');$('#connection span').textContent='Servidor conectado';if(battle?.state)await battle.load(battle.state.id);}catch{}});window.addEventListener('offline',()=>{$('#connection').classList.add('offline');$('#connection span').textContent='Sem conexão';toast('Você está sem conexão. O último movimento confirmado continua salvo.',true)});
window.addEventListener('pagehide',()=>{handGestures?.stop();multiplayer?.stop();voice?.dispose();ar?.close();touch.dispose();arena?.dispose();animation?.audio?.close();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
init();
