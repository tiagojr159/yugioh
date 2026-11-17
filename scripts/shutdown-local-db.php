<?php
/** Somente para a instância de desenvolvimento criada nesta pasta. */
if(PHP_SAPI!=='cli')exit(1);
$file=dirname(__DIR__).'/.tools/mysql-admin.json';if(!is_file($file))exit(0);
$c=json_decode(file_get_contents($file),true,8,JSON_THROW_ON_ERROR);
try{$pdo=new PDO('mysql:host=127.0.0.1;port='.(int)$c['port'],$c['username'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$actual=rtrim(str_replace('\\','/',(string)$pdo->query('SELECT @@datadir')->fetchColumn()),'/');$expected=rtrim(str_replace('\\','/',realpath(dirname(__DIR__).'/storage/mysql')),'/');
if(strcasecmp($actual,$expected)!==0)throw new RuntimeException('A instância não pertence a este projeto.');
$pdo->exec('SHUTDOWN');echo "Banco local encerrado.\n";
}catch(Throwable $e){fwrite(STDERR,"Não foi possível encerrar o banco local: ".$e->getMessage()."\n");exit(1);}
