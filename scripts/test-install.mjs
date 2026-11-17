
import assert from'node:assert/strict';import{spawn}from'node:child_process';import{randomBytes}from'node:crypto';import{mkdir,unlink}from'node:fs/promises';import{existsSync}from'node:fs';import{resolve,join}from'node:path';
const nonce=randomBytes(6).toString('hex'),token=randomBytes(32).toString('hex');await mkdir('tests/.runtime',{recursive:true});
const php=existsSync('.tools/php/php.exe')?resolve('.tools/php/php.exe'):'php';const base='http://localhost:8092/';let cookie='',csrf='',checks=0;const uploads=[];
const server=spawn(php,['-S','localhost:8092','-t','public','public/router.php'],{env:{...process.env,DB_DRIVER:'sqlite',DB_SQLITE_PATH:resolve('tests/.runtime/install-http-'+nonce+'.sqlite'),INSTALL_TOKEN:token,INSTALL_LOCK_PATH:resolve('tests/.runtime/install-http-'+nonce+'.lock'),SESSION_SECURE:'false'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let serverErrors='';server.stderr.on('data',b=>{serverErrors=(serverErrors+b.toString()).slice(-3000)});server.on('error',e=>{serverErrors=e.message});
async function request(path,{method='GET',data,form,status=200}={}){const headers={Accept:'application/json',Cookie:cookie};if(csrf)headers['X-CSRF-Token']=csrf;if(data)headers['Content-Type']='application/json';const r=await fetch(new URL(path,base),{method,headers,body:form||(data?JSON.stringify(data):undefined)});for(const c of r.headers.getSetCookie())cookie=c.split(';')[0];const json=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(json));checks++;return json.data;}
try{
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'api/session');const body=await r.json();if(r.ok){for(const c of r.headers.getSetCookie())cookie=c.split(';')[0];csrf=body.data.csrf;ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Servidor de instalação indisponível: '+serverErrors);
 const data={token,name:'Administrador de teste',email:'admin@example.org',password:'UmaSenhaDeTeste123456!'};
 await request('install',{method:'POST',data:{...data,token:'0'.repeat(64)},status:403});await request('install',{method:'POST',data});await request('install',{method:'POST',data,status:409});
 const me=await request('api/players/me');assert.equal(me.role,'admin');const cards=await request('api/cards');assert.equal(cards.length,6);checks++;
 const badFile=new FormData();badFile.append('file',new Blob(['<?php echo 1;'],{type:'text/plain'}),'program.php');await request('api/admin/uploads',{method:'POST',form:badFile,status:422});
 const badGlb=new FormData();badGlb.append('file',new Blob(['glTF123'],{type:'application/octet-stream'}),'invalid.glb');await request('api/admin/uploads',{method:'POST',form:badGlb,status:422});
 const badPattern=new FormData();badPattern.append('file',new Blob(['255 0 255'],{type:'text/plain'}),'invalid.patt');await request('api/admin/uploads',{method:'POST',form:badPattern,status:422});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1sAAAAASUVORK5CYII=','base64'),form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'pixel.png');const uploaded=await request('api/admin/uploads',{method:'POST',form});assert.match(uploaded.url,/^uploads\/[a-f0-9]{32}\.png$/);uploads.push(uploaded.url);
 const c=cards[0],a=c.abilities[0];const created=await request('api/admin/cards',{method:'POST',data:{...c,slug:'teste-'+nonce,name:'Criatura de teste',image_url:uploaded.url,ability_code:a.code,ability_name:a.name,ability_description:a.description}});assert.equal(created.image_url,uploaded.url);assert.ok(created.id>6);checks++;
 const all=await request('api/admin/overview');assert.equal(all.players.length,1);checks++;
 const r=await fetch(base+'admin',{headers:{Cookie:cookie}});assert.equal(r.status,200);assert.match(await r.text(),/Oficina de criaturas/);checks++;
 console.log(checks+' verificações de instalação e administração HTTP passaram, incluindo upload real e rejeição de arquivos inválidos.');
}finally{server.kill();for(const url of uploads){if(/^uploads\/[a-f0-9]{32}\.png$/.test(url))await unlink(join('public',url)).catch(()=>{});}}
