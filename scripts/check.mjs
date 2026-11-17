import {readdir,readFile} from 'node:fs/promises';import{spawnSync}from'node:child_process';
async function files(path){const out=[];for(const item of await readdir(path,{withFileTypes:true})){const p=path+'/'+item.name;if(item.isDirectory())out.push(...await files(p));else if(/\.(js|mjs)$/.test(p))out.push(p);}return out;}
let failed=0;const paths=[...await files('public/assets/js'),...await files('scripts')];for(const path of paths){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(r.status){console.error(path,r.stderr);failed++;}}
for(const name of ['package.json','composer.json'])JSON.parse(await readFile(name,'utf8'));
for(const slug of['fire','stone','electric','forest','ice','shadow']){const text=await readFile('public/markers/'+slug+'.patt','utf8');const n=text.trim().split(/\s+/).map(Number);if(n.length!==3072||n.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Marcador inválido: '+slug);}
if(failed)process.exit(1);console.log(paths.length+' módulos JavaScript verificados; seis marcadores válidos.');
