<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Repositories\{BattleRepository,CardRepository};
use App\Models\{Deck,Battle};
use App\Validators\Input;
final class BattleService
{
    private function engine(?array $state=null): BattleEngine
    {
        $cards=$state['card_snapshot'] ?? array_column((new CardRepository())->all(),null,'id');
        return new BattleEngine($cards);
    }
    public function create(int $userId,int $deckId): array
    {
        return Database::transaction(function($pdo)use($userId,$deckId){
            // O lock do jogador serializa criações simultâneas no MySQL.
            if($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='mysql'){$lock=$pdo->prepare('SELECT id FROM users WHERE id=? FOR UPDATE');$lock->execute([$userId]);}
            $q=$pdo->prepare("SELECT id FROM battles WHERE user_id=? AND status='active' ORDER BY id DESC LIMIT 1");$q->execute([$userId]);
            if($id=$q->fetchColumn())return $this->public((new BattleRepository())->find((int)$id,$userId));
            $deck=(new DeckService())->find($deckId,$userId);$expanded=Deck::expand($deck['cards']);
            if(count($expanded)<12)throw new ApiException('Este deck precisa de pelo menos 12 cartas ativas.');
            $cards=(new CardRepository())->all();$ai=[];foreach($cards as $c)$ai=array_merge($ai,[$c['id'],$c['id']]);
            if(count($ai)<5)throw new ApiException('O catálogo não tem cartas suficientes para uma batalha.');
            $state=$this->engine()->start($expanded,$ai);$state['card_snapshot']=array_column($cards,null,'id');
            return $this->public((new BattleRepository())->create($userId,$state));
        });
    }
    public function get(int $id,int $userId): array { return $this->public((new BattleRepository())->find($id,$userId)); }
    public function action(int $id,int $userId,string $action,array $data): array
    {
        $version=Input::integer($data,'version',1,PHP_INT_MAX);
        return Database::transaction(function()use($id,$userId,$action,$data,$version){
            $repo=new BattleRepository();$state=$repo->find($id,$userId,true);
            if($state['version']!==$version)throw new ApiException('A partida mudou em outra aba. Sincronize antes de agir.',409);
            $state['events']=[];$engine=$this->engine($state);
            if($action==='summon')$engine->summon($state,'player',Input::integer($data,'card_id',1,PHP_INT_MAX));
            elseif($action==='attack')$engine->attack($state,'player',Input::integer($data,'attacker_id',1,PHP_INT_MAX),isset($data['target_id'])?Input::integer($data,'target_id',1,PHP_INT_MAX):null);
            elseif($action==='end-turn')$engine->endTurn($state);
            elseif($action==='surrender'){if($state['status']!=='active')throw new ApiException('Esta partida já terminou.');$state['status']='finished';$state['winner']='ai';$state['events'][]=['type'=>'victory','side'=>'ai','turn'=>$state['turn']];}
            else throw new ApiException('Ação inválida.');
            $state=$repo->save($state,$version);
            if($state['status']==='finished')(new PlayerService())->record($userId,$state);
            return $this->public($state);
        });
    }
    private function public(array $state): array
    {
        $state=Battle::forPlayer($state);$state['catalog']=array_values($state['card_snapshot'] ?? []);unset($state['card_snapshot']);
        foreach($state['events'] as &$event)if(($event['side'] ?? '')==='ai'&&in_array($event['type'],['draw','discard'],true))unset($event['card_id']);
        return $state;
    }
}
