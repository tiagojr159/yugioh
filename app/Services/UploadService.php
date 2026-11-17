<?php
namespace App\Services;
use App\Core\ApiException;
final class UploadService
{
    public function store(array $file): array
    {
        if(($file['error'] ?? UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK||($file['size'] ?? 0)>10*1024*1024||!is_uploaded_file($file['tmp_name'] ?? ''))throw new ApiException('Envie um arquivo de até 10 MB.');
        $path=$file['tmp_name'];$mime=(new \finfo(FILEINFO_MIME_TYPE))->file($path);$ext=strtolower(pathinfo($file['name'],PATHINFO_EXTENSION));
        if(in_array($mime,['image/png','image/jpeg','image/webp'],true)){$image=getimagesize($path);if(!$image||$image[0]>4096||$image[1]>4096)throw new ApiException('Imagem deve ter até 4096 × 4096 pixels.');$ext=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'][$mime];}
        elseif($ext==='glb'){$bytes=file_get_contents($path);if(strlen($bytes)<24)throw new ApiException('Arquivo GLB incompleto.');$header=unpack('a4magic/Vversion/Vlength',substr($bytes,0,12));if(($header['magic']??'')!=='glTF'||$header['version']!==2||$header['length']!==strlen($bytes))throw new ApiException('Arquivo GLB inválido.');$len=unpack('V',substr($bytes,12,4))[1];$json=json_decode(substr($bytes,20,$len),true);if(!$json||isset($json['extensionsRequired']))throw new ApiException('Use GLB 2.0 sem extensões obrigatórias.');foreach(array_merge($json['buffers']??[],$json['images']??[])as$r)if(isset($r['uri'])&&!str_starts_with($r['uri'],'data:'))throw new ApiException('O GLB deve incorporar todos os recursos.');}
        elseif($ext==='patt'){$text=file_get_contents($path);$numbers=preg_split('/\s+/',trim($text));if(count($numbers)!==3072)throw new ApiException('Marcador deve conter 3072 valores.');foreach($numbers as$n)if(!ctype_digit($n)||(int)$n>255)throw new ApiException('Marcador inválido.');}
        else throw new ApiException('Formatos aceitos: PNG, JPEG, WebP, GLB 2.0 e PATT.');
        $name=bin2hex(random_bytes(16)).'.'.$ext;$dest=BASE_PATH.'/public/uploads/'.$name;
        if(!move_uploaded_file($path,$dest))throw new ApiException('Não foi possível salvar o arquivo.',500);
        return ['url'=>'uploads/'.$name];
    }
}
