<?php
declare(strict_types=1);
namespace App\Core;
use PDO;
final class Database
{
    private static ?PDO $connection = null;
    public static function connection(): PDO
    {
        if (self::$connection) { return self::$connection; }
        $c = config('database');
        if ($c['driver'] === 'sqlite') {
            $path = str_starts_with($c['sqlite_path'], '/') || preg_match('/^[A-Za-z]:/', $c['sqlite_path']) ? $c['sqlite_path'] : BASE_PATH . '/' . $c['sqlite_path'];
            $pdo = new PDO('sqlite:' . $path);
            $pdo->exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
        } else {
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $c['database'])) { throw new \RuntimeException('Nome do banco inválido.'); }
            $pdo = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4", $c['username'], $c['password'], [PDO::ATTR_EMULATE_PREPARES => false]);
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return self::$connection = $pdo;
    }
    public static function transaction(callable $callback): mixed
    {
        $pdo = self::connection();
        $pdo->beginTransaction();
        try { $result = $callback($pdo); $pdo->commit(); return $result; }
        catch (\Throwable $e) { if ($pdo->inTransaction()) { $pdo->rollBack(); } throw $e; }
    }
}
