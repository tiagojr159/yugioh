<?php
declare(strict_types=1);
$runtime=__DIR__.'/.runtime';if(!is_dir($runtime))mkdir($runtime,0777,true);
putenv('DB_DRIVER=sqlite');putenv('DB_SQLITE_PATH='.$runtime.'/test-'.bin2hex(random_bytes(5)).'.sqlite');
require dirname(__DIR__).'/bootstrap/app.php';
require BASE_PATH.'/database/migrations/Migrator.php';require BASE_PATH.'/database/seeders/Seeder.php';
Database\Migrator::run();Database\Seeder::run();
$_SESSION=[];$passed=0;$failed=0;
function check(bool $value,string $message='Asserção falhou'): void { if(!$value)throw new RuntimeException($message); }
function same(mixed $expected,mixed $actual): void { check($expected===$actual,'Esperado '.var_export($expected,true).', recebido '.var_export($actual,true)); }
function rejects(callable $fn,int $status=422): void { try{$fn();}catch(App\Core\ApiException $e){same($status,$e->status);return;}throw new RuntimeException('Esperava ApiException '.$status); }
function test(string $name,callable $fn): void { global $passed,$failed;try{$fn();$passed++;echo "✓ $name\n";}catch(Throwable $e){$failed++;echo "✗ $name: ".$e->getMessage()."\n";} }
$cards=array_column((new App\Repositories\CardRepository())->all(),null,'id');
require __DIR__.'/Unit/combat.php';require __DIR__.'/Integration/services.php';require __DIR__.'/Integration/voice.php';
echo "\n$passed testes passaram; $failed falharam.\n";exit($failed?1:0);
