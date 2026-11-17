<?php
namespace App\Controllers;
use App\Core\Request;
use App\Middleware\Auth;
use App\Services\DeckService;
final class DeckController
{
    public function index(Request $r): array { return (new DeckService())->all((int)Auth::user()['id']); }
    public function create(Request $r): array { return (new DeckService())->save((int)Auth::user()['id'],$r->data); }
    public function update(Request $r,int $id): array { return (new DeckService())->save((int)Auth::user()['id'],$r->data,$id); }
}
