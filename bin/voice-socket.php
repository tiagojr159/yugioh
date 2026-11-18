<?php
declare(strict_types=1);

// Persistent WebSocket notifier for multiplayer voice calls. Run from the project root.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap/app.php';
$port=max(1,(int)env('VOICE_SOCKET_PORT','8090'));
$secret=env('VOICE_SOCKET_SECRET','');
if(strlen($secret)<32){fwrite(STDERR,"Configure VOICE_SOCKET_SECRET com pelo menos 32 caracteres no .env.\n");exit(1);}
$appUrl=parse_url(env('APP_URL',''),PHP_URL_SCHEME).'://'.parse_url(env('APP_URL',''),PHP_URL_HOST);
if(parse_url(env('APP_URL',''),PHP_URL_PORT))$appUrl.=':'.parse_url(env('APP_URL',''),PHP_URL_PORT);
$server=@stream_socket_server('tcp://0.0.0.0:'.$port,$errno,$error,STREAM_SERVER_BIND|STREAM_SERVER_LISTEN);
if(!$server){fwrite(STDERR,"WebSocket indisponível: {$error} ({$errno})\n");exit(1);}
stream_set_blocking($server,false);fwrite(STDOUT,"Sinalização de voz ativa na porta {$port}\n");
$clients=[];
function voiceB64(string $value): string {return rtrim(strtr(base64_encode($value),'+/','-_'),'=');}
function voiceToken(string $token,string $secret): array
{
    $parts=explode('.',$token,2);if(count($parts)!==2)return [];
    [$payload,$signature]=$parts;if(!hash_equals(voiceB64(hash_hmac('sha256',$payload,$secret,true)),$signature))return [];
    $raw=base64_decode(strtr($payload,'-_','+/').str_repeat('=',(4-strlen($payload)%4)%4),true);$claims=$raw===false?null:json_decode($raw,true);
    if(!is_array($claims)||(int)($claims['exp']??0)<time()||(int)($claims['uid']??0)<1||(int)($claims['room']??0)<1||!in_array($claims['role']??'', ['host','guest'],true))return [];
    return $claims;
}
function voiceSend($stream,array $data): void
{
    $body=json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);if($body===false)return;$length=strlen($body);$head="\x81";
    if($length<126)$head.=chr($length);elseif($length<=65535)$head.=chr(126).pack('n',$length);else$head.=chr(127).pack('NN',0,$length);
    @fwrite($stream,$head.$body);
}
function voiceFrame(string &$buffer): ?array
{
    if(strlen($buffer)<2)return null;$first=ord($buffer[0]);$second=ord($buffer[1]);$length=$second&127;$offset=2;
    if($length===126){if(strlen($buffer)<4)return null;$length=unpack('n',substr($buffer,2,2))[1];$offset=4;}
    elseif($length===127){if(strlen($buffer)<10)return null;$size=unpack('Nhigh/Nlow',substr($buffer,2,8));if($size['high']!==0)return ['close'=>true];$length=$size['low'];$offset=10;}
    if($length>8192)return ['close'=>true];$masked=($second&128)!==0;$mask='';
    if($masked){if(strlen($buffer)<$offset+4)return null;$mask=substr($buffer,$offset,4);$offset+=4;}
    if(strlen($buffer)<$offset+$length)return null;$payload=substr($buffer,$offset,$length);$buffer=substr($buffer,$offset+$length);
    if($masked)for($i=0;$i<$length;$i++)$payload[$i]=$payload[$i]^$mask[$i%4];
    $opcode=$first&15;if($opcode===8)return ['close'=>true];if($opcode===9)return ['ping'=>$payload];if($opcode!==1)return ['ignore'=>true];
    $message=json_decode($payload,true);return is_array($message)?['message'=>$message]:['ignore'=>true];
}
function voicePeer(array $clients,int $room,string $role,int $except): void
{
    foreach($clients as $key=>$client)if($key!==$except&&$client['room']===$room&&$client['role']!==$role&&$client['ready'])voiceSend($client['stream'],['type'=>'wake']);
}
while(true){
    $read=[$server];foreach($clients as $client)$read[]=$client['stream'];$write=$except=[];
    if(@stream_select($read,$write,$except,1)===false)continue;
    foreach($read as $stream){
        if($stream===$server){$new=@stream_socket_accept($server,0);if($new){stream_set_blocking($new,false);$clients[(int)$new]=['stream'=>$new,'ready'=>false,'buffer'=>'','handshake'=>'','room'=>0,'uid'=>0,'role'=>''];}continue;}
        $key=(int)$stream;if(!isset($clients[$key]))continue;$chunk=@fread($stream,8192);
        if($chunk===''||$chunk===false){if(feof($stream)){fclose($stream);$old=$clients[$key];unset($clients[$key]);if($old['ready'])voicePeer($clients,$old['room'],$old['role'],$key);}continue;}
        if(!$clients[$key]['ready']){
            $clients[$key]['handshake'].=$chunk;if(strlen($clients[$key]['handshake'])>12000){fclose($stream);unset($clients[$key]);continue;}
            $end=strpos($clients[$key]['handshake'],"\r\n\r\n");if($end===false)continue;$request=substr($clients[$key]['handshake'],0,$end);$tail=substr($clients[$key]['handshake'],$end+4);$headers=[];
            foreach(explode("\r\n",$request)as $line)if(strpos($line,':')!==false){[$name,$value]=explode(':',$line,2);$headers[strtolower(trim($name))]=trim($value);}
            $offered=array_map('trim',explode(',',$headers['sec-websocket-protocol']??''));$token='';foreach($offered as $protocol)if(str_starts_with($protocol,'auth.'))$token=substr($protocol,5);
            $claims=voiceToken($token,$secret);$origin=rtrim($headers['origin']??'','/');
            if(!$claims||!hash_equals($appUrl,$origin)||empty($headers['sec-websocket-key'])||!in_array('arcana-voice-v1',$offered,true)){@fwrite($stream,"HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");fclose($stream);unset($clients[$key]);continue;}
            // A reconnect replaces the older tab for the same participant and room.
            foreach($clients as $otherKey=>$other)if($otherKey!==$key&&$other['ready']&&$other['room']===(int)$claims['room']&&$other['uid']===(int)$claims['uid']){fclose($other['stream']);unset($clients[$otherKey]);}
            $accept=base64_encode(sha1($headers['sec-websocket-key'].'258EAFA5-E914-47DA-95CA-C5AB0DC85B11',true));
            @fwrite($stream,"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {$accept}\r\nSec-WebSocket-Protocol: arcana-voice-v1\r\n\r\n");
            $clients[$key]['ready']=true;$clients[$key]['room']=(int)$claims['room'];$clients[$key]['uid']=(int)$claims['uid'];$clients[$key]['role']=$claims['role'];$clients[$key]['buffer']=$tail;voiceSend($stream,['type'=>'ready']);
            $roles=[];foreach($clients as $client)if($client['ready']&&$client['room']===$clients[$key]['room'])$roles[]=$client['role'];if(in_array('host',$roles,true)&&in_array('guest',$roles,true))foreach($clients as $client)if($client['ready']&&$client['room']===$clients[$key]['room'])voiceSend($client['stream'],['type'=>'peer-ready']);
        }else $clients[$key]['buffer'].=$chunk;
        while(isset($clients[$key])&&($frame=voiceFrame($clients[$key]['buffer']))!==null){
            if(!empty($frame['close'])){@fwrite($stream,"\x88\x00");fclose($stream);$old=$clients[$key];unset($clients[$key]);voicePeer($clients,$old['room'],$old['role'],$key);break;}
            if(isset($frame['ping'])){@fwrite($stream,"\x8a".chr(strlen($frame['ping'])).$frame['ping']);continue;}
            if(!isset($frame['message']))continue;$message=$frame['message'];
            if(($message['type']??'')==='heartbeat')voiceSend($stream,['type'=>'heartbeat']);
            elseif(($message['type']??'')==='wake')voicePeer($clients,$clients[$key]['room'],$clients[$key]['role'],$key);
        }
    }
    foreach($clients as $key=>$client)if(!is_resource($client['stream'])||feof($client['stream'])){if(is_resource($client['stream']))fclose($client['stream']);unset($clients[$key]);}
}
