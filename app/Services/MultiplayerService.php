<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Models\{Battle,Deck};
use App\Repositories\CardRepository;
use App\Validators\Input;

final class MultiplayerService
{
    private function requireSchema(): void
    {
        $this->ensureMultiplayerMigrations();
    }
    private function ensureMultiplayerMigrations(): void
    {
        $pdo=Database::connection();$sqlite=$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='sqlite';
        $hasTable=static function(string $table)use($pdo,$sqlite):bool{
            if($sqlite){$q=$pdo->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1");$q->execute([$table]);}
            else{$q=$pdo->prepare('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1');$q->execute([$table]);}
            return (bool)$q->fetchColumn();
        };
        if(!$hasTable('migrations'))throw new ApiException('O banco ainda nao foi instalado. Conclua a instalacao inicial antes de criar uma sala.',503);
        $tables=['online_presence','multiplayer_rooms','multiplayer_invites','multiplayer_voice_calls','multiplayer_voice_signals'];
        $complete=true;foreach($tables as $table)if(!$hasTable($table)){$complete=false;break;}
        if($sqlite){$columns=$pdo->query('PRAGMA table_info(multiplayer_rooms)')->fetchAll(\PDO::FETCH_COLUMN,1);$hasVoiceKey=in_array('voice_key',$columns,true);}
        else{$q=$pdo->prepare("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='multiplayer_rooms' AND COLUMN_NAME='voice_key' LIMIT 1");$q->execute();$hasVoiceKey=(bool)$q->fetchColumn();}
        $q=$pdo->query("SELECT name FROM migrations WHERE name IN ('002_multiplayer','003_voice_calls','004_multiplayer_voice')");$applied=$q->fetchAll(\PDO::FETCH_COLUMN);
        if($complete&&$hasVoiceKey&&count($applied)===3)return;
        try{require_once BASE_PATH.'/database/migrations/Migrator.php';\Database\Migrator::run(true);}
        catch(\Throwable $e){error_log('[ARCANA multiplayer migration] '.$e->getMessage());throw new ApiException('Nao foi possivel preparar o banco automaticamente. Confira se DB_DATABASE e o banco correto e se o usuario MySQL tem permissao para criar tabelas e adicionar colunas.',503);}
        $complete=true;foreach($tables as $table)if(!$hasTable($table)){$complete=false;break;}
        if($sqlite){$columns=$pdo->query('PRAGMA table_info(multiplayer_rooms)')->fetchAll(\PDO::FETCH_COLUMN,1);$hasVoiceKey=in_array('voice_key',$columns,true);}
        else{$q=$pdo->prepare("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='multiplayer_rooms' AND COLUMN_NAME='voice_key' LIMIT 1");$q->execute();$hasVoiceKey=(bool)$q->fetchColumn();}
        if(!$complete||!$hasVoiceKey)throw new ApiException('A instalacao automatica do multiplayer nao terminou. Confira o banco e as permissoes CREATE e ALTER do usuario MySQL.',503);
    }
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
        $this->requireSchema();
        $pdo=Database::connection();$q=$pdo->prepare('UPDATE online_presence SET seen_at=? WHERE user_id=?');$q->execute([time(),$user]);
        if(!$q->rowCount()){try{$pdo->prepare('INSERT INTO online_presence(user_id,seen_at) VALUES (?,?)')->execute([$user,time()]);}catch(\PDOException $e){$q->execute([time(),$user]);}}
        $q=$pdo->prepare('SELECT users.id,users.name,users.is_guest FROM online_presence JOIN users ON users.id=online_presence.user_id WHERE online_presence.seen_at>=? AND users.id<>? ORDER BY users.name LIMIT 100');$q->execute([time()-45,$user]);
        $players=$q->fetchAll();foreach($players as &$player){if($player['is_guest'])$player['name'].=' #'.$player['id'];unset($player['is_guest']);}unset($player);
        $q=$pdo->prepare("SELECT i.id,i.room_id,u.name,u.id AS sender_id,u.is_guest FROM multiplayer_invites i JOIN users u ON u.id=i.sender_id JOIN multiplayer_rooms r ON r.id=i.room_id WHERE i.recipient_id=? AND i.status='pending' AND r.status='waiting' AND i.created_at>=? ORDER BY i.id DESC LIMIT 20");$q->execute([$user,time()-3600]);$invites=$q->fetchAll();foreach($invites as &$invitation){if($invitation['is_guest'])$invitation['name'].=' #'.$invitation['sender_id'];unset($invitation['is_guest'],$invitation['sender_id']);}unset($invitation);
        return ['players'=>$players,'invites'=>$invites];
    }
    public function create(int $user,array $data): array
    {
        $this->requireSchema();
        $deck=Input::integer($data,'deck_id',1,PHP_INT_MAX);$this->deck($user,$deck);$invite=isset($data['invite_user_id'])?Input::integer($data,'invite_user_id',1,PHP_INT_MAX):null;
        if($invite===$user)throw new ApiException('Escolha outro jogador.');
        if($invite){$q=Database::connection()->prepare('SELECT user_id FROM online_presence WHERE user_id=? AND seen_at>=?');$q->execute([$invite,time()-45]);if(!$q->fetch())throw new ApiException('Este jogador não está mais online.');}
        return Database::transaction(function($pdo)use($user,$deck,$invite){$token=bin2hex(random_bytes(24));$voiceKey=bin2hex(random_bytes(32));$now=time();$q=$pdo->prepare('INSERT INTO multiplayer_rooms(token_hash,voice_key,host_id,invited_id,host_deck,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');$q->execute([hash('sha256',$token),$voiceKey,$user,$invite,$deck,$now,$now]);$id=(int)$pdo->lastInsertId();if($invite)$pdo->prepare('INSERT INTO multiplayer_invites(room_id,sender_id,recipient_id,created_at) VALUES (?,?,?,?)')->execute([$id,$user,$invite,$now]);return ['id'=>$id,'token'=>$token,'voice_key'=>$voiceKey,'my_role'=>'host'];});
    }
    public function join(int $id,int $user,array $data,bool $invite=false): array
    {
        $this->requireSchema();
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
    public function get(int $id,int $user): array { $this->requireSchema();return $this->view($this->room($id),$user); }
    private function view(array $r,int $user): array
    {
        $host=(int)$r['host_id']===$user;$guest=(int)($r['guest_id']??0)===$user;if(!$host&&!$guest)throw new ApiException('Você não participa desta sala.',403);
        if($r['status']==='waiting')return ['id'=>(int)$r['id'],'multiplayer'=>true,'status'=>'waiting','version'=>(int)$r['version'],'voice_key'=>$r['voice_key'],'my_role'=>$host?'host':'guest'];
        $s=json_decode($r['state_json'],true,64,JSON_THROW_ON_ERROR);
        if($guest){[$s['player'],$s['ai']]=[$s['ai'],$s['player']];foreach(['active_side','winner'] as $key)if($s[$key]!==null)$s[$key]=$s[$key]==='player'?'ai':'player';foreach($s['events'] as &$event)if(isset($event['side'])&&in_array($event['side'],['player','ai'],true))$event['side']=$event['side']==='player'?'ai':'player';unset($event);}
        $s=Battle::forPlayer($s);foreach($s['events'] as &$event)if(($event['side']??'')==='ai'&&in_array($event['type'],['draw','discard'],true))unset($event['card_id']);unset($event);
        $s['catalog']=array_values($s['card_snapshot']);unset($s['card_snapshot']);$s['id']=(int)$r['id'];$s['version']=(int)$r['version'];$s['multiplayer']=true;$s['voice_key']=$r['voice_key'];$s['my_role']=$host?'host':'guest';
        $q=Database::connection()->prepare('SELECT name FROM users WHERE id=?');$q->execute([$host?$r['guest_id']:$r['host_id']]);$s['opponent_name']=$q->fetchColumn()?:'Adversário';return $s;
    }
    public function authorizeVoice(int $roomId,string $key,string $role): array
    {
        $this->requireSchema();
        if(!in_array($role,['host','guest'],true)||!preg_match('/^[a-f0-9]{64}$/',$key))throw new ApiException('Chamada não autorizada.',403);
        $q=Database::connection()->prepare("SELECT voice_key,host_id,guest_id,status FROM multiplayer_rooms WHERE id=? AND status='active'");$q->execute([$roomId]);$r=$q->fetch();
        if(!$r||!hash_equals((string)$r['voice_key'],$key)||empty($r[$role.'_id']))throw new ApiException('Chamada não autorizada.',403);
        return ['authorized'=>true];
    }
    private function requireVoiceSchema(): void
    {
        $this->ensureMultiplayerMigrations();
        $pdo=Database::connection();
        foreach(['multiplayer_voice_calls','multiplayer_voice_signals'] as $table){
            if($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='sqlite'){$q=$pdo->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1");$q->execute([$table]);}
            else{$q=$pdo->prepare('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1');$q->execute([$table]);}
            $exists=$q->fetchColumn();
            if(!$exists)throw new ApiException('Atualize o banco: execute php bin/console.php migrate ou importe database/migrations/004_multiplayer_voice.sql.',503);
        }
    }
    private function voiceParticipants(int $roomId,int $user): array
    {
        $r=$this->room($roomId);$host=(int)$r['host_id'];$guest=(int)($r['guest_id']??0);
        if($r['status']!=='active'||!in_array($user,[$host,$guest],true))throw new ApiException('A chamada só está disponível para os jogadores desta partida ativa.',403);
        return [$r,$host===$user?$guest:$host];
    }
    public function voiceSocketToken(int $roomId,int $user): array
    {
        $this->requireSchema();[$room]=$this->voiceParticipants($roomId,$user);$role=(int)$room['host_id']===$user?'host':'guest';
        $secret=env('VOICE_SOCKET_SECRET','');$url=env('VOICE_WS_URL','');$enabled=strlen($secret)>=32&&$url!=='';
        $token='';if($enabled){$payload=rtrim(strtr(base64_encode(json_encode(['uid'=>$user,'room'=>$roomId,'role'=>$role,'exp'=>time()+90],JSON_THROW_ON_ERROR)),'+/','-_'),'=');$signature=rtrim(strtr(base64_encode(hash_hmac('sha256',$payload,$secret,true)),'+/','-_'),'=');$token=$payload.'.'.$signature;}
        $iceServers=[['urls'=>'stun:stun.l.google.com:19302']];$turnUrls=array_values(array_filter(array_map('trim',explode(',',env('VOICE_TURN_URLS','')))));
        $turnUser=env('VOICE_TURN_USERNAME','');$turnPassword=env('VOICE_TURN_PASSWORD','');if($turnUrls&&$turnUser!==''&&$turnPassword!=='')$iceServers[]=['urls'=>$turnUrls,'username'=>$turnUser,'credential'=>$turnPassword];
        return ['enabled'=>$enabled,'token'=>$token,'expires_in'=>90,'url'=>$url,'port'=>(int)env('VOICE_SOCKET_PORT','8091'),'ice_servers'=>$iceServers];
    }
    public function voiceStart(int $roomId,int $user): array
    {
        $this->requireSchema();[$room,$other]=$this->voiceParticipants($roomId,$user);$role=(int)$room['host_id']===$user?'host':'guest';
        return Database::transaction(function($pdo)use($roomId,$user,$other,$role){
            if($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)==='mysql'){$lock=$pdo->prepare('SELECT id FROM multiplayer_rooms WHERE id=? FOR UPDATE');$lock->execute([$roomId]);$lock->fetch();}
            $now=time();$pdo->prepare("UPDATE multiplayer_voice_calls SET status='missed',updated_at=? WHERE room_id=? AND status='ringing' AND created_at<?")->execute([$now,$roomId,$now-35]);
            $q=$pdo->prepare("SELECT id FROM multiplayer_voice_calls WHERE room_id=? AND status IN ('ringing','accepted') ORDER BY id DESC LIMIT 1");$q->execute([$roomId]);if($q->fetchColumn())throw new ApiException('Já existe uma chamada ativa nesta partida.',409);
            $q=$pdo->prepare("INSERT INTO multiplayer_voice_calls(room_id,caller_id,callee_id,status,created_at,updated_at,caller_seen,callee_seen) VALUES(?,?,?,'ringing',?,?,?,0)");$q->execute([$roomId,$user,$other,$now,$now,$now]);
            return ['id'=>(int)$pdo->lastInsertId(),'room_id'=>$roomId,'caller_id'=>$user,'callee_id'=>$other,'role'=>$role,'status'=>'ringing'];
        });
    }
    public function voiceTransition(int $roomId,int $user,array $data): array
    {
        $this->requireSchema();[$room]=$this->voiceParticipants($roomId,$user);$id=filter_var($data['call_id']??null,FILTER_VALIDATE_INT);$action=$data['action']??'';
        if(!$id||!in_array($action,['accept','decline','end'],true))throw new ApiException('Ação de chamada inválida.');
        $pdo=Database::connection();$q=$pdo->prepare('SELECT * FROM multiplayer_voice_calls WHERE id=? AND room_id=?');$q->execute([$id,$roomId]);$call=$q->fetch();if(!$call)throw new ApiException('Chamada não encontrada.',404);
        $isCaller=(int)$call['caller_id']===$user;$isCallee=(int)$call['callee_id']===$user;if(!$isCaller&&!$isCallee)throw new ApiException('Você não participa desta chamada.',403);
        if($action==='accept'||$action==='decline'){if(!$isCallee||$call['status']!=='ringing')throw new ApiException('Esta chamada não pode ser atendida.',409);if(time()-(int)$call['created_at']>35){$pdo->prepare("UPDATE multiplayer_voice_calls SET status='missed',updated_at=? WHERE id=? AND status='ringing'")->execute([time(),$id]);throw new ApiException('Esta chamada expirou.',409);}$status=$action==='accept'?'accepted':'declined';}
        else{$status='ended';if(!in_array($call['status'],['ringing','accepted'],true))return ['ok'=>true,'status'=>$call['status']];}
        $now=time();$allowed=$action==='end'?"status IN ('ringing','accepted')":"status='ringing'";$q=$pdo->prepare("UPDATE multiplayer_voice_calls SET status=?,updated_at=?,caller_seen=?,callee_seen=? WHERE id=? AND {$allowed}");$q->execute([$status,$now,$now,$now,$id]);if(!$q->rowCount())throw new ApiException('A chamada mudou de estado. Atualize a partida.',409);return ['ok'=>true,'status'=>$status];
    }
    public function voiceSignal(int $roomId,int $user,array $data): array
    {
        $this->requireSchema();[$room]=$this->voiceParticipants($roomId,$user);$id=filter_var($data['call_id']??null,FILTER_VALIDATE_INT);$type=$data['type']??'';$payload=$data['payload']??null;
        if(!$id||!in_array($type,['offer','answer','ice'],true)||!is_array($payload))throw new ApiException('Sinal de chamada inválido.');
        $encoded=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);if(strlen($encoded)>64000)throw new ApiException('Sinal de chamada excede o limite.',413);
        $pdo=Database::connection();$q=$pdo->prepare('SELECT * FROM multiplayer_voice_calls WHERE id=? AND room_id=?');$q->execute([$id,$roomId]);$call=$q->fetch();if(!$call)throw new ApiException('Chamada não encontrada.',404);
        $isCaller=(int)$call['caller_id']===$user;$isCallee=(int)$call['callee_id']===$user;if(!$isCaller&&!$isCallee)throw new ApiException('Você não participa desta chamada.',403);
        if($call['status']==='ringing'&&time()-(int)$call['created_at']>35){$pdo->prepare("UPDATE multiplayer_voice_calls SET status='missed',updated_at=? WHERE id=? AND status='ringing'")->execute([time(),$id]);throw new ApiException('Esta chamada expirou.',409);}
        $validStatus=$call['status']==='accepted'||($call['status']==='ringing'&&$isCaller&&in_array($type,['offer','ice'],true));if(!$validStatus)throw new ApiException('A chamada não está disponível para sinalização.',409);
        $recipient=$isCaller?(int)$call['callee_id']:(int)$call['caller_id'];$pdo->prepare('INSERT INTO multiplayer_voice_signals(call_id,sender_id,recipient_id,signal_type,payload,created_at) VALUES(?,?,?,?,?,?)')->execute([$id,$user,$recipient,$type,$encoded,time()]);return ['ok'=>true];
    }
    public function voicePoll(int $roomId,int $user,int $after): array
    {
        $this->requireSchema();[$room]=$this->voiceParticipants($roomId,$user);$pdo=Database::connection();$now=time();
        if(random_int(1,120)===1){$pdo->prepare('DELETE FROM multiplayer_voice_signals WHERE created_at<?')->execute([$now-3600]);$pdo->prepare("DELETE FROM multiplayer_voice_calls WHERE updated_at<? AND status NOT IN ('ringing','accepted')")->execute([$now-86400]);}
        $pdo->prepare("UPDATE multiplayer_voice_calls SET status='missed',updated_at=? WHERE room_id=? AND status='ringing' AND created_at<?")->execute([$now,$roomId,$now-35]);
        $pdo->prepare("UPDATE multiplayer_voice_calls SET status='ended',updated_at=? WHERE room_id=? AND status='accepted' AND (caller_seen<? OR callee_seen<?)")->execute([$now,$roomId,$now-65,$now-65]);
        $pdo->prepare('UPDATE multiplayer_voice_calls SET '.((int)$room['host_id']===$user?'caller_seen':'callee_seen').'=? WHERE room_id=? AND status IN (\'ringing\',\'accepted\') AND (caller_id=? OR callee_id=?)')->execute([$now,$roomId,$user,$user]);
        $q=$pdo->prepare("SELECT id,room_id,caller_id,callee_id,status,created_at FROM multiplayer_voice_calls WHERE room_id=? AND (status IN ('ringing','accepted') OR updated_at>=?) ORDER BY id DESC LIMIT 1");$q->execute([$roomId,$now-120]);$call=$q->fetch()?:null;
        if($call){foreach(['id','room_id','caller_id','callee_id','created_at'] as $key)$call[$key]=(int)$call[$key];$call['caller_role']=(int)$call['caller_id']===(int)$room['host_id']?'host':'guest';}
        $q=$pdo->prepare("SELECT s.id,s.call_id,s.signal_type,s.payload FROM multiplayer_voice_signals s JOIN multiplayer_voice_calls c ON c.id=s.call_id WHERE c.room_id=? AND s.recipient_id=? AND s.id>? AND c.status IN ('ringing','accepted') ORDER BY s.id LIMIT 100");$q->execute([$roomId,$user,max(0,$after)]);$signals=$q->fetchAll();
        foreach($signals as &$signal){$signal['id']=(int)$signal['id'];$signal['call_id']=(int)$signal['call_id'];$signal['payload']=json_decode($signal['payload'],true); }unset($signal);
        return ['call'=>$call,'signals'=>$signals];
    }
    public function action(int $id,int $user,string $action,array $data): array
    {
        $this->requireSchema();
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
