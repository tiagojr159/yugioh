<?php
declare(strict_types=1);
namespace App\Validators;
use App\Core\ApiException;
final class Input
{
    public static function text(array $data, string $key, int $min, int $max): string
    {
        $value = $data[$key] ?? null;
        if (!is_string($value) || mb_strlen(trim($value)) < $min || mb_strlen(trim($value)) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', $value)) { throw new ApiException("Campo inválido: $key."); }
        return trim($value);
    }
    public static function integer(array $data, string $key, int $min, int $max): int
    {
        $v = $data[$key] ?? null;
        if (filter_var($v, FILTER_VALIDATE_INT) === false || (int)$v < $min || (int)$v > $max || is_bool($v)) { throw new ApiException("Valor inválido: $key."); }
        return (int)$v;
    }
}
