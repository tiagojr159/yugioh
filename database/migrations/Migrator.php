<?php
namespace Database;
use App\Core\Database;
final class Migrator
{
    public static function run(): void
    {
        $pdo = Database::connection();
        $exists = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'sqlite'
            ? $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")->fetch()
            : $pdo->query("SHOW TABLES LIKE 'migrations'")->fetch();
        if ($exists) { echo "Schema já instalado.\n"; return; }
        $sql = file_get_contents(BASE_PATH . '/database/schema.sql');
        if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'sqlite') { $sql = str_replace('AUTO_INCREMENT', 'AUTOINCREMENT', $sql); }
        foreach (explode(';', $sql) as $statement) { if (trim($statement)) { $pdo->exec($statement); } }
        $pdo->prepare('INSERT INTO migrations(name) VALUES (?)')->execute(['001_initial_schema']);
        echo "Migration 001 concluída.\n";
    }
}
