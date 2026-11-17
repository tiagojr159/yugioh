<?php
namespace App\Models;
final class User { public static function publicData(array $row): array { unset($row['password_hash']); $row['id']=(int)$row['id']; $row['is_guest']=(bool)$row['is_guest']; return $row; } }
