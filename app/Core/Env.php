<?php
declare(strict_types=1);
namespace App\Core;
final class Env
{
    public static function load(string $path): void
    {
        if (!is_file($path)) { return; }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) { continue; }
            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            if (getenv($name) === false) { putenv($name . '=' . trim(trim($value), "\"'")); }
        }
    }
}
