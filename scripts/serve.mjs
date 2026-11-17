import{existsSync,readFileSync,mkdirSync,openSync}from'node:fs';import{spawn,spawnSync}from'node:child_process';import{connect}from'node:net';import{fileURLToPath}from'node:url';import{join}from'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);const config={};
if(!existsSync('.env'))throw Error('Copie .env.example para .env, configure o MySQL e execute create-db. Consulte README.md.');
for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)config[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const php=process.platform==='win32'&&existsSync('.tools/php/php.exe')?join(root,'.tools/php/php.exe'):'php';
const listening=(port,host='127.0.0.1')=>new Promise(resolve=>{const s=connect({port,host});s.on('connect',()=>{s.destroy();resolve(true)});s.on('error',()=>resolve(false));s.setTimeout(500,()=>{s.destroy();resolve(false)});});
let database,server,closing=false;
async function cleanup(){if(closing)return;closing=true;server?.kill();if(database)spawnSync(php,['scripts/shutdown-local-db.php'],{stdio:'inherit',windowsHide:true});process.exit();}
process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);
try{
 const port=Number(process.env.PORT||8080);if(await listening(port,'localhost'))throw Error('A porta '+port+' já está em uso. Abra http://localhost:'+port+' ou escolha PORT.');
 if(config.DB_DRIVER==='mysql'&&config.DB_PORT==='3307'&&existsSync('storage/mysql/my.ini')&&!await listening(3307)){
  const bin=process.env.LOCAL_MYSQL_BIN||'C:/xampp/mysql/bin/mysqld.exe';if(!existsSync(bin))throw Error('Inicie o MySQL configurado no .env.');
  mkdirSync('storage/logs',{recursive:true});const log=openSync('storage/logs/mysql-dev.log','a');database=spawn(bin,['--defaults-file='+join(root,'storage/mysql/my.ini'),'--bind-address=127.0.0.1','--port=3307','--skip-name-resolve'],{stdio:['ignore',log,log],windowsHide:true});database.on('error',e=>{console.error(e.message);cleanup()});
  let ready=false;for(let i=0;i<80;i++){if(await listening(3307)){ready=true;break;}await new Promise(r=>setTimeout(r,250));}if(!ready)throw Error('O banco não iniciou. Consulte storage/logs/mysql-dev.log.');
 }
 for(const command of['migrate','seed']){const r=spawnSync(php,['bin/console.php',command],{stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Falha na preparação do banco.');}
 server=spawn(php,['-S','localhost:'+port,'-t','public','public/router.php'],{stdio:'inherit',windowsHide:true});server.on('error',e=>{console.error(e.message);cleanup()});server.on('exit',cleanup);
 console.log('\nARCANA: http://localhost:'+port+'\nCtrl+C encerra os processos iniciados por este comando.\n');
}catch(e){console.error(e.message);await cleanup();}
