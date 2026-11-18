<?php
use App\Services\MultiplayerService;
use App\Services\DeckService;

test('Chamada multiplayer persiste convites e sinais WebRTC com autorizacao por participante',function()use($userId,$other,$deckId){
    $voice=new MultiplayerService();$guest=(int)$other['id'];$guestDeck=(new DeckService())->all($guest)[0]['id'];
    $room=$voice->create($userId,['deck_id'=>$deckId]);$joined=$voice->join($room['id'],$guest,['deck_id'=>$guestDeck,'token'=>$room['token']]);same('active',$joined['status']);
    $call=$voice->voiceStart($room['id'],$userId);same('ringing',$call['status']);same('host',$call['role']);rejects(fn()=>$voice->voiceStart($room['id'],$guest),409);
    $voice->voiceSignal($room['id'],$userId,['action'=>'signal','call_id'=>$call['id'],'type'=>'offer','payload'=>['type'=>'offer','sdp'=>'v=0']]);
    $incoming=$voice->voicePoll($room['id'],$guest,0);same('host',$incoming['call']['caller_role']);same('offer',$incoming['signals'][0]['signal_type']);
    $voice->voiceTransition($room['id'],$guest,['action'=>'accept','call_id'=>$call['id']]);
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
