<?php
namespace App\Controllers;
use App\Core\Request;
use App\Middleware\Auth;
use App\Services\BattleService;
final class BattleController
{
    public function create(Request $r): array { return (new BattleService())->create((int)Auth::user()['id'],\App\Validators\Input::integer($r->data,'deck_id',1,PHP_INT_MAX)); }
    public function show(Request $r,int $id): array { return (new BattleService())->get($id,(int)Auth::user()['id']); }
    public function summon(Request $r,int $id): array { return $this->action($r,$id,'summon'); }
    public function attack(Request $r,int $id): array { return $this->action($r,$id,'attack'); }
    public function endTurn(Request $r,int $id): array { return $this->action($r,$id,'end-turn'); }
    public function surrender(Request $r,int $id): array { return $this->action($r,$id,'surrender'); }
    public function history(Request $r,int $id): array { return (new \App\Repositories\BattleRepository())->history($id,(int)Auth::user()['id']); }
    private function action(Request $r,int $id,string $action): array { return (new BattleService())->action($id,(int)Auth::user()['id'],$action,$r->data); }
}
