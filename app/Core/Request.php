<?php
declare(strict_types=1);
namespace App\Core;
final class Request
{
    public readonly array $data;
    public function __construct(public readonly string $method, public readonly string $path)
    {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 12 * 1024 * 1024) { throw new ApiException('Requisição muito grande.', 413); }
        if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
            $raw = file_get_contents('php://input');
            try { $data = json_decode($raw ?: '{}', true, 32, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { throw new ApiException('JSON inválido.', 400); }
            if (!is_array($data)) { throw new ApiException('Envie um objeto JSON.', 400); }
            $this->data = $data;
        } else { $this->data = $_POST; }
    }
}
