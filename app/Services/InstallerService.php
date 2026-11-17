<?php
declare(strict_types=1);
namespace App\Services;
use App\Core\{ApiException,Database};
use App\Validators\Input;
/** Instalação inicial por navegador, autorizada por segredo exclusivo do pacote. */
final class InstallerService
{
    private readonly string $lockPath;
    public function __construct(?string $lockPath=null) { $this->lockPath=$lockPath ?? env('INSTALL_LOCK_PATH',BASE_PATH.'/storage/install.lock'); }
    public function install(array $data): array
    {
        $expected=env('INSTALL_TOKEN');$token=Input::text($data,'token',32,128);
        if(strlen($expected)<32||!hash_equals($expected,$token))throw new ApiException('Código de instalação inválido. Confira INSTALL_TOKEN no arquivo .env.',403);
        $name=Input::text($data,'name',2,60);$email=strtolower(Input::text($data,'email',5,190));$password=Input::text($data,'password',12,128);
        if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new ApiException('Informe um e-mail válido para a administração.');
        foreach(['pdo','mbstring','fileinfo'] as $extension)if(!extension_loaded($extension))throw new ApiException('Habilite a extensão PHP '.$extension.' na hospedagem.',503);
        $file=fopen($this->lockPath,'c+');if(!$file)throw new ApiException('A hospedagem precisa permitir escrita na pasta storage.',503);
        try{
            flock($file,LOCK_EX);$pdo=Database::connection();
            $exists=$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='sqlite'?$pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetch():$pdo->query("SHOW TABLES LIKE 'users'")->fetch();
            if($exists&&(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn()>0)throw new ApiException('A instalação já foi concluída. Entre na arena com sua conta.',409);
            require_once BASE_PATH.'/database/migrations/Migrator.php';require_once BASE_PATH.'/database/seeders/Seeder.php';
            ob_start();try{\Database\Migrator::run();\Database\Seeder::run();}finally{ob_end_clean();}
            $user=(new AuthService())->register(compact('name','email','password'));
            $pdo->prepare("UPDATE users SET role='admin' WHERE id=?")->execute([$user['id']]);
            ftruncate($file,0);rewind($file);fwrite($file,date('c').' installed');
            return ['message'=>'Instalação concluída. Seu deck e sua conta administrativa estão prontos.'];
        }finally{flock($file,LOCK_UN);fclose($file);}
    }
}
