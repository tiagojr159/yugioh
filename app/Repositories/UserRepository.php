<?php
namespace App\Repositories;
use App\Core\Database;
final class UserRepository
{
    public function find(int $id): ?array { $q=Database::connection()->prepare('SELECT * FROM users WHERE id=?'); $q->execute([$id]); return $q->fetch() ?: null; }
    public function byEmail(string $email): ?array { $q=Database::connection()->prepare('SELECT * FROM users WHERE email=?'); $q->execute([$email]); return $q->fetch() ?: null; }
    public function create(string $name,string $email,string $hash,bool $guest=false): int
    {
        $q=Database::connection()->prepare('INSERT INTO users(name,email,password_hash,is_guest) VALUES (?,?,?,?)'); $q->execute([$name,$email,$hash,(int)$guest]); return (int)Database::connection()->lastInsertId();
    }
}
