import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const nonce=randomBytes(6).toString('hex');await mkdir('tests/.runtime',{recursive:true});
const php=existsSync('.tools/php/php.exe')?resolve('.tools/php/php.exe'):'php',base='http://localhost:8093/';
const env={...process.env,DB_DRIVER:'sqlite',DB_SQLITE_PATH:resolve('tests/.runtime/multiplayer-'+nonce+'.sqlite'),SESSION_SECURE:'false',APP_URL:base,RATE_LIMIT_PATH:resolve('tests/.runtime/rates-'+nonce)};
for(const command of ['migrate','seed']){const r=spawnSync(php,['bin/console.php',command],{env,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
const server=spawn(php,['-S','localhost:8093','-t','public','public/router.php'],{env,stdio:'ignore',windowsHide:true});
class Client {
 constructor(){this.cookie='';this.csrf='';}
 async request(path,data,expected=200){const r=await fetch(base+'api/'+path,{method:data?'POST':'GET',headers:{Cookie:this.cookie,'Content-Type':'application/json','X-CSRF-Token':this.csrf},body:data?JSON.stringify(data):undefined});for(const c of r.headers.getSetCookie()){assert.match(c,/Max-Age=2592000/i);this.cookie=c.split(';')[0];}const json=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(json));return json.data;}
 async init(){this.csrf=(await this.request('session')).csrf;this.user=await this.request('auth/guest',{});this.deck=(await this.request('decks'))[0].id;}
}
const host=new Client(),guest=new Client();
const affordable=s=>s.player.hand.find(id=>s.catalog.some(c=>c.id===id&&c.cost<=s.player.energy));
try{
 for(let i=0;i<60;i++){try{if((await fetch(base+'api/session')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await host.init();await guest.init();const room=await host.request('multiplayer/rooms',{deck_id:host.deck});
 const waiting=await host.request('multiplayer/rooms/'+room.id);assert.equal(waiting.status,'waiting');assert.equal(waiting.my_role,'host');
 const guestState=await guest.request(`multiplayer/rooms/${room.id}/join`,{deck_id:guest.deck,token:room.token});assert.equal(guestState.active_side,'player');assert.equal(guestState.opponent_name,host.user.name);
 let s=guestState;
 // Two complete rounds, through actual HTTP routes/cookies/CSRF, with both
 // phones summoning and attacking the same server-authoritative board.
 for(const [actor,observer] of [[guest,host],[host,guest],[guest,host],[host,guest]]){
  s=await actor.request('multiplayer/rooms/'+room.id);assert.equal(s.active_side,'player');
  const card=affordable(s);assert.ok(card);s=await actor.request(`multiplayer/rooms/${room.id}/summon`,{card_id:card,version:s.version});
  const summoned=s.player.field.at(-1),remote=await observer.request('multiplayer/rooms/'+room.id);assert.ok(remote.ai.field.some(m=>m.id===summoned.id));assert.equal(remote.version,s.version);
  s=await actor.request(`multiplayer/rooms/${room.id}/attack`,{attacker_id:summoned.id,target_id:s.ai.field[0]?.id??null,version:s.version});assert.equal(s.player.field.find(m=>m.id===summoned.id).attacked,true);
  s=await actor.request(`multiplayer/rooms/${room.id}/end-turn`,{version:s.version});assert.equal(s.active_side,'ai');
 }
 const first=await guest.request(`multiplayer/rooms/${room.id}/voice`,{action:'start'}),second=await host.request(`multiplayer/rooms/${room.id}/voice`,{action:'start'});assert.equal(first.id,second.id);assert.equal(second.status,'accepted');assert.equal(second.caller_role,'guest');
 for(let i=0;i<95;i++)await guest.request(`multiplayer/rooms/${room.id}/voice`,{action:'signal',call_id:first.id,type:'ice',payload:{candidate:'candidate:'+i}});
 const poll=await host.request(`multiplayer/rooms/${room.id}/voice?after=0`);assert.equal(poll.signals.length,95);
 s=await guest.request('multiplayer/rooms/'+room.id);await guest.request(`multiplayer/rooms/${room.id}/end-turn`,{version:s.version});
 await host.request(`multiplayer/rooms/${room.id}/voice`,{action:'end',call_id:first.id});
 console.log('Duas sessoes HTTP: convite, sala vazia, 4 turnos com invocacoes/ataques sincronizados, voz simultanea e 95 candidatos ICE sem bloquear o jogo: OK.');
}finally{server.kill();}
