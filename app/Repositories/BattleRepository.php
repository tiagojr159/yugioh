<?php
namespace App\Repositories;
use App\Core\{Database,ApiException};
final class BattleRepository
{
    public function find(int $id,int $userId,bool $lock=false): array
    {
        $pdo=Database::connection();
        $q=$pdo->prepare('SELECT * FROM battles WHERE id=? AND user_id=?'.($lock && $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':''));
        $q->execute([$id,$userId]); $row=$q->fetch();
        if(!$row)throw new ApiException('Partida não encontrada.',404);
        $state=json_decode($row['state_json'],true,64,JSON_THROW_ON_ERROR);$state['id']=(int)$row['id'];$state['version']=(int)$row['version'];return $state;
    }
    public function create(int $userId,array $state): array
    {
        $pdo=Database::connection();$q=$pdo->prepare('INSERT INTO battles(user_id,state_json) VALUES (?,?)');$q->execute([$userId,json_encode($state)]);
        $state['id']=(int)$pdo->lastInsertId();$state['version']=1;
        foreach(['player','ai'] as $side) { $pdo->prepare('INSERT INTO battle_players(battle_id,user_id,side,hp) VALUES (?,?,?,?)')->execute([$state['id'],$side==='player'?$userId:null,$side,4000]); }
        $this->audit($state);return $state;
    }
    public function save(array $state,int $oldVersion): array
    {
        $pdo=Database::connection();$q=$pdo->prepare('UPDATE battles SET state_json=?,status=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?');
        $q->execute([json_encode($state),$state['status'],$state['id'],$oldVersion]);
        if($q->rowCount()!==1)throw new ApiException('A partida foi atualizada. Sincronize e tente novamente.',409);
        $state['version']=$oldVersion+1;$this->audit($state);return $state;
    }
    private function audit(array $state): void
    {
        $pdo=Database::connection();
        $q=$pdo->prepare('INSERT INTO battle_actions(battle_id,turn_number,event_type,actor,payload) VALUES (?,?,?,?,?)');
        foreach($state['events'] as $event) { $q->execute([$state['id'],$event['turn'],$event['type'],$event['side'] ?? 'system',json_encode($event)]); }
        $turns=$pdo->prepare('SELECT turn_number FROM battle_turns WHERE battle_id=?');$turns->execute([$state['id']]);$known=array_column($turns->fetchAll(),'turn_number');
        foreach($state['events'] as $event) { if($event['type']==='turn' && !in_array($event['turn'],$known)) { $pdo->prepare('INSERT INTO battle_turns(battle_id,turn_number,side) VALUES (?,?,?)')->execute([$state['id'],$event['turn'],$event['side']]);$known[]=$event['turn']; } }
        $pdo->prepare('DELETE FROM battle_monsters WHERE battle_id=?')->execute([$state['id']]);
        foreach(['player','ai'] as $side) {
            $pdo->prepare('UPDATE battle_players SET hp=? WHERE battle_id=? AND side=?')->execute([$state[$side]['hp'],$state['id'],$side]);
            foreach($state[$side]['field'] as $m) { $pdo->prepare('INSERT INTO battle_monsters(battle_id,card_id,unit_key,side,hp,state_json) VALUES (?,?,?,?,?,?)')->execute([$state['id'],$m['card_id'],$m['id'],$side,$m['hp'],json_encode($m)]); }
        }
    }
    public function history(int $id,int $userId): array { $this->find($id,$userId);$q=Database::connection()->prepare('SELECT id,turn_number,event_type,payload,created_at FROM battle_actions WHERE battle_id=? ORDER BY id DESC LIMIT 100');$q->execute([$id]);$rows=$q->fetchAll();foreach($rows as &$row){$event=json_decode($row['payload'],true);if(($event['side'] ?? '')==='ai'&&in_array($event['type'],['draw','discard'],true))unset($event['card_id']);$row['payload']=$event;}return $rows; }
}
