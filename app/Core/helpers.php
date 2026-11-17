<?php
declare(strict_types=1);
function env(string $key, string $default = ''): string { $value = getenv($key); return $value === false ? $default : $value; }
function config(string $file): array { static $cache = []; return $cache[$file] ??= require BASE_PATH . '/config/' . $file . '.php'; }
function e(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
