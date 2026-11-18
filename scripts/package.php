<?php
declare(strict_types=1);
/** Pacote de hospedagem inclui dependências; exclui credenciais e dados locais. */
if(PHP_SAPI!=='cli')exit(1);
$root=dirname(__DIR__);$out=$root.'/dist/arcana-servidor.zip';$zip=new ZipArchive();if($zip->open($out,ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)throw new RuntimeException('Não foi possível criar o pacote.');
$dirs=['app','bootstrap','config','database','public','resources','routes','vendor','docs','bin'];
foreach($dirs as $dir){$iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/'.$dir,FilesystemIterator::SKIP_DOTS));foreach($iterator as $file){if(!$file->isFile())continue;$path=str_replace('\\','/',substr($file->getPathname(),strlen($root)+1));if(str_starts_with($path,'public/uploads/')&&$path!=='public/uploads/.htaccess')continue;$zip->addFile($file->getPathname(),$path);}}
foreach(['index.php','.htaccess','composer.json','composer.lock','README.md','LICENSE']as $file)$zip->addFile($root.'/'.$file,$file);
foreach(['storage','storage/logs','storage/sessions','storage/rate-limits']as $dir)$zip->addEmptyDir($dir);
$env="APP_NAME=ARCANA\nAPP_ENV=production\nAPP_DEBUG=false\nAPP_URL=https://ki6.com.br/yugioh\nSESSION_SECURE=true\nDB_DRIVER=mysql\nDB_HOST=localhost\nDB_PORT=3306\nDB_DATABASE=preencha_o_nome_do_banco\nDB_USERNAME=preencha_o_usuario_do_banco\nDB_PASSWORD=preencha_a_senha_do_banco\nINSTALL_TOKEN=".bin2hex(random_bytes(32))."\n";
$zip->addFromString('.env.example',$env);
$zip->addFile($root.'/docs/INSTALAR-NO-SERVIDOR.md','LEIA-ME-SERVIDOR.md');
$zip->close();
$verify=new ZipArchive();$verify->open($out);foreach(['index.php','.htaccess','.env.example','public/.htaccess','public/assets/vendor/three/three.module.js','public/assets/vendor/ar-threex.mjs','public/assets/vendor/camera_para.dat','vendor/autoload.php','resources/views/install/index.php','storage/sessions/']as $required)if($verify->locateName($required)===false)throw new RuntimeException('Arquivo ausente no ZIP: '.$required);
foreach(['.env','.tools/mysql-admin.json','storage/mysql/my.ini','storage/game.sqlite']as $forbidden)if($verify->locateName($forbidden)!==false)throw new RuntimeException('Arquivo local indevido no ZIP.');
$count=$verify->numFiles;$verify->close();echo "Pacote pronto: dist/arcana-servidor.zip ($count arquivos/diretórios).\n";
