<?php
use App\Services\MultiplayerService;
use App\Services\DeckService;

test('Chamada multiplayer persiste convites e sinais WebRTC com autorizacao por participante',function()use($userId,$other,$deckId){
    $voice=new MultiplayerService();$guest=(int)$other['id'];$guestDeck=(new DeckService())->all($guest)[0]['id'];
    $room=$voice->create($userId,['deck_id'=>$deckId]);$joined=$voice->join($room['id'],$guest,['deck_id'=>$guestDeck,'token'=>$room['token']]);same('active',$joined['status']);
    $call=$voice->voiceStart($room['id'],$userId);same('ringing',$call['status']);same('host',$call['role']);same($call['id'],$voice->voiceStart($room['id'],$userId)['id']);
    $voice->voiceSignal($room['id'],$userId,['action'=>'signal','call_id'=>$call['id'],'type'=>'offer','payload'=>['type'=>'offer','sdp'=>'v=0']]);
    $incoming=$voice->voicePoll($room['id'],$guest,0);same('host',$incoming['call']['caller_role']);same('offer',$incoming['signals'][0]['signal_type']);
    $accepted=$voice->voiceStart($room['id'],$guest);same($call['id'],$accepted['id']);same('accepted',$accepted['status']);same('host',$accepted['caller_role']);same($call['id'],$voice->voiceStart($room['id'],$guest)['id']);
    $voice->voiceSignal($room['id'],$guest,['action'=>'signal','call_id'=>$call['id'],'type'=>'answer','payload'=>['type'=>'answer','sdp'=>'v=0']]);
    $answer=$voice->voicePoll($room['id'],$userId,0);same('accepted',$answer['call']['status']);same('answer',$answer['signals'][0]['signal_type']);
    $voice->voiceTransition($room['id'],$userId,['action'=>'end','call_id'=>$call['id']]);same('ended',$voice->voicePoll($room['id'],$guest,1)['call']['status']);
    rejects(fn()=>$voice->voicePoll($room['id'],999999,0),403);
});

test('Token do socket assina sala e papel do jogador com validade curta',function()use($userId,$other,$deckId){
    $voice=new MultiplayerService();$guest=(int)$other['id'];$guestDeck=(new DeckService())->all($guest)[0]['id'];$room=$voice->create($userId,['deck_id'=>$deckId]);$voice->join($room['id'],$guest,['deck_id'=>$guestDeck,'token'=>$room['token']]);
    $oldSecret=getenv('VOICE_SOCKET_SECRET');$oldUrl=getenv('VOICE_WS_URL');putenv('VOICE_SOCKET_SECRET='.str_repeat('s',48));putenv('VOICE_WS_URL=wss://ki6.com.br/socket/');
    try{$issued=$voice->voiceSocketToken($room['id'],$guest);check($issued['enabled']);$parts=explode('.',$issued['token']);same(2,count($parts));$expected=rtrim(strtr(base64_encode(hash_hmac('sha256',$parts[0],str_repeat('s',48),true)),'+/','-_'),'=');same($expected,$parts[1]);$raw=base64_decode(strtr($parts[0],'-_','+/').str_repeat('=',(4-strlen($parts[0])%4)%4),true);$claims=json_decode($raw,true);same($room['id'],$claims['room']);same($guest,$claims['uid']);same('guest',$claims['role']);check($claims['exp']>time()&&$claims['exp']<=time()+90);}
    finally{$oldSecret===false?putenv('VOICE_SOCKET_SECRET'):putenv('VOICE_SOCKET_SECRET='.$oldSecret);$oldUrl===false?putenv('VOICE_WS_URL'):putenv('VOICE_WS_URL='.$oldUrl);}
});

test('Convidado pode ligar primeiro e anfitriao entra na mesma chamada sem encerrar',function()use($userId,$other,$deckId){
    $voice=new MultiplayerService();$guest=(int)$other['id'];$guestDeck=(new DeckService())->all($guest)[0]['id'];
    $room=$voice->create($userId,['deck_id'=>$deckId]);$voice->join($room['id'],$guest,['deck_id'=>$guestDeck,'token'=>$room['token']]);
    $call=$voice->voiceStart($room['id'],$guest);same('guest',$call['caller_role']);
    $pdo=App\Core\Database::connection();$pdo->prepare('UPDATE multiplayer_voice_calls SET created_at=?,caller_seen=?,callee_seen=0 WHERE id=?')->execute([time()-600,time()-20,$call['id']]);
    $voice->voicePoll($room['id'],$userId,0);$q=$pdo->prepare('SELECT caller_seen,callee_seen FROM multiplayer_voice_calls WHERE id=?');$q->execute([$call['id']]);$seen=$q->fetch();same(time()-20,(int)$seen['caller_seen']);check((int)$seen['callee_seen']>=time()-1);
    $accepted=$voice->voiceStart($room['id'],$userId);same($call['id'],$accepted['id']);same('accepted',$accepted['status']);same('guest',$accepted['caller_role']);
    $voice->voiceSignal($room['id'],$guest,['call_id'=>$call['id'],'type'=>'offer','payload'=>['sdp'=>'guest-offer','type'=>'offer']]);
    same('offer',$voice->voicePoll($room['id'],$userId,0)['signals'][0]['signal_type']);
    $voice->voiceTransition($room['id'],$userId,['call_id'=>$call['id'],'action'=>'end']);
    $next=$voice->voiceStart($room['id'],$guest);check($next['id']!==$call['id']);same('ringing',$next['status']);
});

test('Primeiro acesso ao multiplayer aplica automaticamente as migrations pendentes',function()use($userId){
    $pdo=App\Core\Database::connection();
    $pdo->exec('DROP TABLE IF EXISTS multiplayer_voice_signals');$pdo->exec('DROP TABLE IF EXISTS multiplayer_voice_calls');$pdo->exec('DROP TABLE IF EXISTS multiplayer_invites');$pdo->exec('DROP TABLE IF EXISTS online_presence');$pdo->exec('DROP TABLE IF EXISTS multiplayer_rooms');
    $pdo->exec("DELETE FROM migrations WHERE name IN ('002_multiplayer','003_voice_calls','004_multiplayer_voice')");
    (new MultiplayerService())->presence($userId);
    foreach(['online_presence','multiplayer_rooms','multiplayer_invites','multiplayer_voice_calls','multiplayer_voice_signals'] as $table){$q=$pdo->prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?");$q->execute([$table]);check((bool)$q->fetchColumn(),'Tabela ausente apos instalacao automatica: '.$table);}
    $columns=$pdo->query('PRAGMA table_info(multiplayer_rooms)')->fetchAll(PDO::FETCH_COLUMN,1);check(in_array('voice_key',$columns,true),'Coluna voice_key ausente apos instalacao automatica.');
});
