
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:8080/';let checks=0;
class Client{
 constructor(){this.cookie='';this.csrf='';}
 async call(path,{method='GET',data,raw,csrf=true,expected=200}={}){
  const headers={Accept:'application/json'};if(this.cookie)headers.Cookie=this.cookie;if(csrf&&this.csrf)headers['X-CSRF-Token']=this.csrf;if(data||raw)headers['Content-Type']='application/json';
  const r=await fetch(new URL('api/'+path,base),{method,headers,body:raw??(data?JSON.stringify(data):undefined)});for(const cookie of r.headers.getSetCookie())this.cookie=cookie.split(';')[0];const body=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(body));checks++;return body.data;
 }
 async init(){const s=await this.call('session');this.csrf=s.csrf;return s;}
}
const a=new Client(),b=new Client();await a.init();await b.init();const cards=await a.call('cards');assert.equal(cards.length,6);assert.equal(cards[0].name,'Dragão de Fogo');checks++;
await a.call('../install',{method:'POST',data:{token:'0'.repeat(64),name:'Tentativa teste',email:'none@example.org',password:'UmaSenha123456'},expected:403});await a.call('players/me',{expected:401});await a.call('auth/guest',{method:'POST',data:{},csrf:false,expected:419});await a.call('auth/guest',{method:'POST',raw:'{broken',expected:400});
await a.call('auth/guest',{method:'POST',data:{}});await b.call('auth/guest',{method:'POST',data:{}});await a.call('admin/cards',{expected:403});
const decks=await a.call('decks'),state=await a.call('battles',{method:'POST',data:{deck_id:decks[0].id}});assert.equal(state.player.hand.length,5);assert.equal(state.ai.hand,undefined);assert.equal(state.card_snapshot,undefined);checks++;
await b.call('battles/'+state.id,{expected:404});await b.call('decks/'+decks[0].id,{method:'PUT',data:{name:'Tentativa',cards:[]},expected:404});
await a.call('battles/'+state.id+'/end-turn',{method:'POST',data:{version:0},expected:422});await a.call('battles/'+state.id+'/end-turn',{method:'POST',data:{version:999},expected:409});
const valid=state.player.hand.find(id=>cards.find(c=>c.id===id).cost<=state.player.energy);let s=await a.call('battles/'+state.id+'/summon',{method:'POST',data:{version:state.version,card_id:valid}});
await a.call('battles/'+s.id+'/summon',{method:'POST',data:{version:s.version,card_id:s.player.hand[0]},expected:422});await a.call('battles/'+s.id+'/attack',{method:'POST',data:{version:s.version,attacker_id:999999},expected:422});
s=await a.call('battles/'+s.id+'/attack',{method:'POST',data:{version:s.version,attacker_id:s.player.field[0].id,damage:99999999}});assert.ok(s.ai.hp>2000);checks++;
s=await a.call('battles/'+s.id+'/end-turn',{method:'POST',data:{version:s.version}});assert.equal(s.turn,3);assert.equal(s.active_side,'player');assert.ok(s.events.some(e=>e.type==='summon'&&e.side==='ai'));checks++;
const resumed=await a.call('battles/'+s.id);assert.equal(resumed.version,s.version);assert.equal(resumed.ai.hand,undefined);assert.equal(resumed.card_snapshot,undefined);checks++;
const history=await a.call('battles/'+s.id+'/history');assert.ok(history.length>=5);checks++;
s=await a.call('battles/'+s.id+'/surrender',{method:'POST',data:{version:s.version}});assert.equal(s.status,'finished');assert.equal(s.winner,'ai');checks++;
const stats=await a.call('players/me/statistics');assert.equal(stats.battles,1);assert.equal(stats.losses,1);checks++;
await a.call('battles/'+s.id+'/attack',{method:'POST',data:{version:s.version,attacker_id:s.player.field[0]?.id||1},expected:422});
const logout=await a.call('auth/logout',{method:'POST',data:{}});a.csrf=logout.csrf;await a.call('players/me',{expected:401});
// Também confere roteamento, recursos estáticos e isolamento do document root.
for(const path of['','install','markers','assets/css/app.css','assets/js/app.js','assets/vendor/three/three.module.js','assets/vendor/ar-threex.mjs','assets/vendor/camera_para.dat']){const r=await fetch(new URL(path,base));assert.equal(r.status,200,path);await r.arrayBuffer();checks++;}
for(const path of['.env','../.env','storage/mysql/my.ini','app/Core/Database.php']){const r=await fetch(new URL(path,base));assert.ok([404,403].includes(r.status),path);await r.arrayBuffer();checks++;}
console.log(checks+' verificações HTTP passaram: CSRF, sessão, cartas, decks, IA, persistência, autorização, recursos e isolamento.');
