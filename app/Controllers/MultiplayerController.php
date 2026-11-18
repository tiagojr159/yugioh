<?php
namespace App\Controllers;
use App\Core\Request;
use App\Middleware\Auth;
use App\Services\MultiplayerService;
final class MultiplayerController
{
    private function user(): int { return (int)Auth::user()['id']; }
    public function presence(Request $r): array { return (new MultiplayerService())->presence($this->user()); }
    public function create(Request $r): array { return (new MultiplayerService())->create($this->user(),$r->data); }
    public function show(Request $r,int $id): array { return (new MultiplayerService())->get($id,$this->user()); }
    public function join(Request $r,int $id): array { return (new MultiplayerService())->join($id,$this->user(),$r->data); }
    public function accept(Request $r,int $id): array { return (new MultiplayerService())->join($id,$this->user(),$r->data,true); }
    public function decline(Request $r,int $id): array { return (new MultiplayerService())->decline($id,$this->user()); }
    public function summon(Request $r,int $id): array { return (new MultiplayerService())->action($id,$this->user(),'summon',$r->data); }
    public function attack(Request $r,int $id): array { return (new MultiplayerService())->action($id,$this->user(),'attack',$r->data); }
    public function endTurn(Request $r,int $id): array { return (new MultiplayerService())->action($id,$this->user(),'end-turn',$r->data); }
    public function surrender(Request $r,int $id): array { return (new MultiplayerService())->action($id,$this->user(),'surrender',$r->data); }
}
