<?php
declare(strict_types=1);
$dir=dirname(__DIR__).'/.runtime';if(!is_dir($dir))mkdir($dir,0777,true);
putenv('DB_DRIVER=sqlite');putenv('DB_SQLITE_PATH='.$dir.'/install-'.bin2hex(random_bytes(5)).'.sqlite');$token=bin2hex(random_bytes(32));putenv('INSTALL_TOKEN='.$token);
require dirname(__DIR__,2).'/bootstrap/app.php';$_SESSION=[];
$service=new App\Services\InstallerService($dir.'/install-lock-'.bin2hex(random_bytes(5)));$data=['token'=>$token,'name'=>'Administrador teste','email'=>'install@example.org','password'=>'UmaSenhaMuitoForte123!'];
try{$service->install($data);$user=(new App\Repositories\UserRepository())->byEmail($data['email']);if(!$user||$user['role']!=='admin')throw new RuntimeException('Administrador não criado.');if(count((new App\Repositories\CardRepository())->all())!==6)throw new RuntimeException('Catálogo incompleto.');
try{$service->install($data);throw new RuntimeException('Reinstalação foi aceita.');}catch(App\Core\ApiException $e){if($e->status!==409)throw $e;}
$data['token']=str_repeat('0',64);try{$service->install($data);throw new RuntimeException('Token inválido foi aceito.');}catch(App\Core\ApiException $e){if($e->status!==403)throw $e;}
echo "Instalador validado: seis cartas, primeiro administrador, token e bloqueio de reinstalação.\n";
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
