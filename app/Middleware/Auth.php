<?php
declare(strict_types=1);
namespace App\Middleware;
use App\Core\ApiException;
use App\Repositories\UserRepository;
final class Auth
{
    public static function user(): array
    {
        $user = isset($_SESSION['user_id']) ? (new UserRepository())->find((int)$_SESSION['user_id']) : null;
        if (!$user) { throw new ApiException('Entre na sua conta para continuar.', 401); }
        return $user;
    }
    public static function admin(): array { $user = self::user(); if ($user['role'] !== 'admin') { throw new ApiException('Acesso restrito à administração.', 403); } return $user; }
}
