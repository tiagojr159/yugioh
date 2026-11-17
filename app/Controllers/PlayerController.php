<?php
namespace App\Controllers;
use App\Core\Request;
use App\Middleware\Auth;
final class PlayerController
{
    public function me(Request $r): array { return \App\Models\User::publicData(Auth::user()); }
    public function statistics(Request $r): array { return (new \App\Services\PlayerService())->statistics((int)Auth::user()['id']); }
    public function collection(Request $r): array { return (new \App\Repositories\CardRepository())->collection((int)Auth::user()['id']); }
}
