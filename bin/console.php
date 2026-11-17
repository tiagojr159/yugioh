<?php
require dirname(__DIR__).'/bootstrap/app.php';
$command=$argv[1] ?? 'help';
try {
    switch($command){
        case 'create-db':
            $c=config('database');if($c['driver']==='sqlite'){echo "SQLite será criado na migration.\n";break;}
            if(!preg_match('/^[a-zA-Z0-9_]+$/',$c['database']))throw new RuntimeException('Nome do banco inválido.');
            $pdo=new PDO("mysql:host={$c['host']};port={$c['port']};charset=utf8mb4",$c['username'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
            $pdo->exec('CREATE DATABASE IF NOT EXISTS '.$c['database'].' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');echo "Banco criado.\n";break;
        case 'migrate':require BASE_PATH.'/database/migrations/Migrator.php';Database\Migrator::run();break;
        case 'seed':require BASE_PATH.'/database/seeders/Seeder.php';Database\Seeder::run();break;
        case 'admin':
            $email=strtolower($argv[2] ?? '');if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Uso: php bin/console.php admin email@exemplo.com');
            $q=App\Core\Database::connection()->prepare("UPDATE users SET role='admin' WHERE email=? AND is_guest=0");$q->execute([$email]);echo $q->rowCount()?"Administrador atualizado.\n":"Conta registrada não encontrada ou já é administradora.\n";break;
        default:echo "Comandos: create-db, migrate, seed, admin <email>\n";
    }
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
