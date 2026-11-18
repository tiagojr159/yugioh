<?php
namespace Database;
use App\Core\Database;
use PDO;
use RuntimeException;

final class Migrator
{
    public static function run(bool $quiet = false): void
    {
        $lock = @fopen(BASE_PATH . '/storage/migrations.lock', 'c');
        if (!$lock) throw new RuntimeException('A pasta storage precisa permitir a criacao do arquivo de trava das migrations.');
        try {
            if (!flock($lock, LOCK_EX)) throw new RuntimeException('Nao foi possivel obter a trava das migrations.');
            self::migrate($quiet);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private static function migrate(bool $quiet): void
    {
        $pdo = Database::connection();
        $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $exists = $sqlite
            ? $pdo->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='migrations' LIMIT 1")->fetchColumn()
            : $pdo->query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='migrations' LIMIT 1")->fetchColumn();
        if (!$exists) {
            $sql = file_get_contents(BASE_PATH . '/database/schema.sql');
            self::executeStatements($pdo, $sql, $sqlite);
            $pdo->prepare('INSERT INTO migrations(name) VALUES (?)')->execute(['001_initial_schema']);
            self::report($quiet, "Migration 001 concluida.\n");
        }

        $q = $pdo->prepare('SELECT name FROM migrations WHERE name=?');
        $q->execute(['002_multiplayer']);
        if (!$q->fetch()) {
            $sql = file_get_contents(BASE_PATH . '/database/migrations/002_multiplayer.sql');
            self::executeStatements($pdo, $sql, $sqlite);
            $pdo->prepare('INSERT INTO migrations(name) VALUES (?)')->execute(['002_multiplayer']);
            self::report($quiet, "Migration 002 concluida.\n");
        }

        $q = $pdo->prepare('SELECT name FROM migrations WHERE name=?');
        $q->execute(['003_voice_calls']);
        if (!$q->fetch()) {
            $hasVoiceKey = $sqlite
                ? in_array('voice_key', $pdo->query('PRAGMA table_info(multiplayer_rooms)')->fetchAll(PDO::FETCH_COLUMN, 1), true)
                : (function () use ($pdo) { $q = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='multiplayer_rooms' AND COLUMN_NAME='voice_key'"); $q->execute(); return (bool)$q->fetchColumn(); })();
            if (!$hasVoiceKey) self::executeStatements($pdo, file_get_contents(BASE_PATH . '/database/migrations/003_voice_calls.sql'), $sqlite);
            $pdo->prepare('INSERT INTO migrations(name) VALUES (?)')->execute(['003_voice_calls']);
            self::report($quiet, "Migration 003 concluida.\n");
        }

        $q = $pdo->prepare('SELECT name FROM migrations WHERE name=?');
        $q->execute(['004_multiplayer_voice']);
        if (!$q->fetch()) {
            $sql = file_get_contents(BASE_PATH . '/database/migrations/004_multiplayer_voice.sql');
            self::executeStatements($pdo, $sql, $sqlite);
            $pdo->prepare('INSERT INTO migrations(name) VALUES (?)')->execute(['004_multiplayer_voice']);
            self::report($quiet, "Migration 004 concluida.\n");
        }
    }

    private static function executeStatements(PDO $pdo, string $sql, bool $sqlite): void
    {
        if ($sqlite) $sql = str_replace('AUTO_INCREMENT', 'AUTOINCREMENT', $sql);
        foreach (explode(';', $sql) as $statement) {
            $statement = trim($statement);
            if ($statement === '') continue;
            if (preg_match('/^CREATE\s+INDEX\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)/i', $statement, $match)
                && self::indexExists($pdo, $match[1], $match[2], $sqlite)) continue;
            $pdo->exec($statement);
        }
    }

    private static function indexExists(PDO $pdo, string $index, string $table, bool $sqlite): bool
    {
        if ($sqlite) {
            $q = $pdo->query('PRAGMA index_list(' . $pdo->quote($table) . ')');
            foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) if (($row['name'] ?? '') === $index) return true;
            return false;
        }
        $q = $pdo->prepare('SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? LIMIT 1');
        $q->execute([$table, $index]);
        return (bool)$q->fetchColumn();
    }

    private static function report(bool $quiet, string $message): void
    {
        if (!$quiet) echo $message;
    }
}
