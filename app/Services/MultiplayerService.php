<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Models\{Battle,Deck};
use App\Repositories\CardRepository;
use App\Validators\Input;

final class MultiplayerService
{
    private function room(int $id,bool $lock=false): array
    {
        $pdo=Database::connection();$q=$pdo->prepare('SELECT * FROM multiplayer_rooms WHERE id=?'.($lock&&$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':''));$q->execute([$id]);
        return $q->fetch() ?: throw new ApiException('Sala não encontrada.',404);
    }
    private function deck(int $user,int $deck): array
    {
        $expanded=Deck::expand((new DeckService())->find($deck,$user)['cards']);
        if(count($expanded)<12)throw new ApiException('Seu deck precisa ter pelo menos 12 cartas.');return $expanded;
    }
    public function presence(int $user): array
    {
        $pdo=Database::connection();$q=$pdo->prepare('UPDATE online_presence SET seen_at=? WHERE user_id=?');$q->execute([time(),$user]);
        if(!$q->rowCount()){try{$pdo->prepare('INSERT INTO online_presence(user_id,seen_at) VALUES (?,?)')->execute([$user,time()]);}catch(\PDOException $e){$q->execute([time(),$user]);}}
        $q=$pdo->prepare('SELECT users.id,users.name,users.is_guest FROM online_presence JOIN users ON users.id=online_presence.user_id WHERE online_presence.seen_at>=? AND users.id<>? ORDER BY users.name LIMIT 100');$q->execute([time()-45,$user]);
        $players=$q->fetchAll();foreach($players as &$player){if($player['is_guest'])$player['name'].=' #'.$player['id'];unset($player['is_guest']);}unset($player);
        $q=$pdo->prepare("SELECT i.id,i.room_id,u.name,u.id AS sender_id,u.is_guest FROM multiplayer_invites i JOIN users u ON u.id=i.sender_id JOIN multiplayer_rooms r ON r.id=i.room_id WHERE i.recipient_id=? AND i.status='pending' AND r.status='waiting' AND i.created_at>=? ORDER BY i.id DESC LIMIT 20");$q->execute([$user,time()-3600]);$invites=$q->fetchAll();foreach($invites as &$invitation){if($invitation['is_guest'])$invitation['name'].=' #'.$invitation['sender_id'];unset($invitation['is_guest'],$invitation['sender_id']);}unset($invitation);
        return ['players'=>$players,'invites'=>$invites];
    }
    public function create(int $user,array $data): array
    {
        $deck=Input::integer($data,'deck_id',1,PHP_INT_MAX);$this->deck($user,$deck);$invite=isset($data['invite_user_id'])?Input::integer($data,'invite_user_id',1,PHP_INT_MAX):null;
        if($invite===$user)throw new ApiException('Escolha outro jogador.');
        if($invite){$q=Database::connection()->prepare('SELECT user_id FROM online_presence WHERE user_id=? AND seen_at>=?');$q->execute([$invite,time()-45]);if(!$q->fetch())throw new ApiException('Este jogador não está mais online.');}
        return Database::transaction(function($pdo)use($user,$deck,$invite){$token=bin2hex(random_bytes(24));$now=time();$q=$pdo->prepare('INSERT INTO multiplayer_rooms(token_hash,host_id,invited_id,host_deck,created_at,updated_at) VALUES (?,?,?,?,?,?)');$q->execute([hash('sha256',$token),$user,$invite,$deck,$now,$now]);$id=(int)$pdo->lastInsertId();if($invite)$pdo->prepare('INSERT INTO multiplayer_invites(room_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?)')->execute([$id,$user,$invite,$now]);return ['id'=>$id,'token'=>$token];});
    }
    public function join(int $id,int $user,array $data,bool $invite=false): array
    {
        $deck=Input::integer($data,'deck_id',1,PHP_INT_MAX);$guestDeck=$this->deck($user,$deck);
        return Database::transaction(function($pdo)use($id,$user,$data,$invite,$guestDeck){
            $r=$this->room($id,true);if((int)$r['host_id']===$user || (int)($r['guest_id']??0)===$user)return $this->view($r,$user);
            if($r['status']!=='waiting'||time()-(int)$r['created_at']>3600)throw new ApiException('Esta sala está cheia ou expirou.',409);
            if($r['invited_id']!==null&&(int)$r['invited_id']!==$user)throw new ApiException('Esta sala é reservada ao jogador convidado.',403);
            if($invite){$q=$pdo->prepare("SELECT id FROM multiplayer_invites WHERE room_id=? AND recipient_id=? AND status='pending' AND created_at>=?");$q->execute([$id,$user,time()-3600]);if(!$q->fetch())throw new ApiException('Convite indisponível.',403);}
            else{ $token=$data['token']??'';if(!is_string($token)||!hash_equals($r['token_hash'],hash('sha256',$token)))throw new ApiException('Link de convite inválido.',403); }
            $cards=(new CardRepository())->all();$snapshot=array_column($cards,null,'id');$state=(new BattleEngine($snapshot))->start($this->deck((int)$r['host_id'],(int)$r['host_deck']),$guestDeck);$state['card_snapshot']=$snapshot;
            $pdo->prepare("UPDATE multiplayer_rooms SET guest_id=?,status='active',state_json=?,version=version+1,updated_at=? WHERE id=?")->execute([$user,json_encode($state,JSON_THROW_ON_ERROR),time(),$id]);
            $pdo->prepare("UPDATE multiplayer_invites SET status='accepted' WHERE room_id=? AND recipient_id=? AND status='pending'")->execute([$id,$user]);return $this->view($this->room($id),$user);
        });
    }
    public function get(int $id,int $user): array { return $this->view($this->room($id),$user); }
    private function view(array $r,int $user): array
    {
        $host=(int)$r['host_id']===$user;$guest=(int)($r['guest_id']??0)===$user;if(!$host&&!$guest)throw new ApiException('Você não participa desta sala.',403);
        if($r['status']==='waiting')return ['id'=>(int)$r['id'],'multiplayer'=>true,'status'=>'waiting','version'=>(int)$r['version']];
        $s=json_decode($r['state_json'],true,64,JSON_THROW_ON_ERROR);
        if($guest){[$s['player'],$s['ai']]=[$s['ai'],$s['player']];foreach(['active_side','winner'] as $key)if($s[$key]!==null)$s[$key]=$s[$key]==='player'?'ai':'player';foreach($s['events'] as &$event)if(isset($event['side'])&&in_array($event['side'],['player','ai'],true))$event['side']=$event['side']==='player'?'ai':'player';unset($event);}
        $s=Battle::forPlayer($s);foreach($s['events'] as &$event)if(($event['side']??'')==='ai'&&in_array($event['type'],['draw','discard'],true))unset($event['card_id']);unset($event);
        $s['catalog']=array_values($s['card_snapshot']);unset($s['card_snapshot']);$s['id']=(int)$r['id'];$s['version']=(int)$r['version'];$s['multiplayer']=true;
        $q=Database::connection()->prepare('SELECT name FROM users WHERE id=?');$q->execute([$host?$r['guest_id']:$r['host_id']]);$s['opponent_name']=$q->fetchColumn()?:'Adversário';return $s;
    }
    public function action(int $id,int $user,string $action,array $data): array
    {
        $version=Input::integer($data,'version',1,PHP_INT_MAX);
        return Database::transaction(function($pdo)use($id,$user,$action,$data,$version){$r=$this->room($id,true);$host=(int)$r['host_id']===$user;$guest=(int)($r['guest_id']??0)===$user;if(!$host&&!$guest)throw new ApiException('Você não participa desta sala.',403);if($r['status']!=='active')throw new ApiException('A partida não está ativa.',409);if((int)$r['version']!==$version)throw new ApiException('A partida mudou. Sincronize e tente novamente.',409);
            $s=json_decode($r['state_json'],true,64,JSON_THROW_ON_ERROR);$s['events']=[];$side=$host?'player':'ai';$engine=new BattleEngine($s['card_snapshot']);
            if($action==='summon')$engine->summon($s,$side,Input::integer($data,'card_id',1,PHP_INT_MAX));
            elseif($action==='attack')$engine->attack($s,$side,Input::integer($data,'attacker_id',1,PHP_INT_MAX),isset($data['target_id'])?Input::integer($data,'target_id',1,PHP_INT_MAX):null);
            elseif($action==='end-turn')$engine->endHumanTurn($s,$side);
            elseif($action==='surrender'){$s['status']='finished';$s['winner']=$host?'ai':'player';$s['events'][]=['type'=>'victory','side'=>$s['winner'],'turn'=>$s['turn']];}
            else throw new ApiException('Ação inválida.');
            $q=$pdo->prepare('UPDATE multiplayer_rooms SET state_json=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=?');$q->execute([json_encode($s,JSON_THROW_ON_ERROR),$s['status'],time(),$id,$version]);if($q->rowCount()!==1)throw new ApiException('A partida mudou.',409);return $this->view($this->room($id),$user);
        });
    }
    public function decline(int $invite,int $user): array { $q=Database::connection()->prepare("UPDATE multiplayer_invites SET status='declined' WHERE id=? AND recipient_id=? AND status='pending'");$q->execute([$invite,$user]);return ['ok'=>true]; }
}
