<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Validators\Input;
use App\Repositories\CardRepository;
final class CardService
{
    public function save(array $data,?int $id=null): array
    {
        $repo=new CardRepository();if($id!==null&&!$repo->find($id,true))throw new ApiException('Carta não encontrada.',404);
        $name=Input::text($data,'name',2,80);$description=Input::text($data,'description',5,2000);$slug=Input::text($data,'slug',2,60);
        if(!preg_match('/^[a-z0-9-]+$/',$slug))throw new ApiException('Identificador deve conter letras minúsculas, números ou hífen.');
        $element=Input::text($data,'element',2,20);$rarity=Input::text($data,'rarity',2,20);$archetype=Input::text($data,'archetype',2,30);
        if(!in_array($element,['fogo','terra','raio','natureza','gelo','sombra'],true)||!in_array($rarity,['comum','rara','épica','lendária'],true)||!in_array($archetype,['dragon','golem','warrior','spirit','serpent','knight'],true))throw new ApiException('Elemento, raridade ou forma inválidos.');
        $cost=Input::integer($data,'cost',1,10);$atk=Input::integer($data,'attack',100,4000);$def=Input::integer($data,'defense',0,3000);$hp=Input::integer($data,'hp',100,6000);
        $color=Input::text($data,'color',7,7);if(!preg_match('/^#[0-9a-fA-F]{6}$/',$color))throw new ApiException('Cor inválida.');
        $image=$this->asset($data['image_url'] ?? '',['assets/cards/','uploads/'],['svg','png','jpg','jpeg','webp']);
        $model=empty($data['model_url'])?null:$this->asset($data['model_url'],['assets/models3d/','uploads/'],['glb']);
        $marker=$this->asset($data['marker_url'] ?? '',['markers/','uploads/'],['patt']);
        $active=Input::integer($data,'active',0,1);$ability=Input::text($data,'ability_code',2,30);
        if(!in_array($ability,['burn','shield','pierce','regenerate','frost','lifesteal'],true))throw new ApiException('Habilidade inválida.');
        $abilityName=Input::text($data,'ability_name',2,80);$abilityDesc=Input::text($data,'ability_description',3,500);
        $id=Database::transaction(function($pdo)use($id,$name,$description,$slug,$element,$rarity,$archetype,$cost,$atk,$def,$hp,$color,$image,$model,$marker,$active,$ability,$abilityName,$abilityDesc){
            $q=$pdo->prepare('SELECT id FROM cards WHERE slug=?');$q->execute([$slug]);$exists=$q->fetchColumn();if($exists&&((int)$exists!==$id))throw new ApiException('Identificador já utilizado.');
            $values=[$slug,$name,$description,$element,$rarity,$cost,$image,$model,$marker,$color,$active];
            if($id===null){$pdo->prepare('INSERT INTO cards(slug,name,description,element,rarity,cost,image_url,model_url,marker_url,color,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute($values);$id=(int)$pdo->lastInsertId();$pdo->prepare('INSERT INTO monsters(card_id,attack,defense,hp,archetype,animations) VALUES (?,?,?,?,?,?)')->execute([$id,$atk,$def,$hp,$archetype,json_encode(['idle','summon','attack','hit','defeat'])]);}
            else{$values[]=$id;$pdo->prepare('UPDATE cards SET slug=?,name=?,description=?,element=?,rarity=?,cost=?,image_url=?,model_url=?,marker_url=?,color=?,active=? WHERE id=?')->execute($values);$pdo->prepare('UPDATE monsters SET attack=?,defense=?,hp=?,archetype=? WHERE card_id=?')->execute([$atk,$def,$hp,$archetype,$id]);$pdo->prepare('DELETE FROM card_abilities WHERE card_id=?')->execute([$id]);}
            $pdo->prepare('INSERT INTO card_abilities(card_id,code,name,description) VALUES (?,?,?,?)')->execute([$id,$ability,$abilityName,$abilityDesc]);return $id;
        });return $repo->find($id,true);
    }
    private function asset(mixed $value,array $prefixes,array $extensions): string
    {
        if(!is_string($value)||str_contains($value,'..')||!preg_match('/^[a-zA-Z0-9_\/.\-]+$/',$value))throw new ApiException('Caminho de arquivo inválido.');
        if(!array_filter($prefixes,fn($p)=>str_starts_with($value,$p))||!in_array(strtolower(pathinfo($value,PATHINFO_EXTENSION)),$extensions,true)||!is_file(BASE_PATH.'/public/'.$value))throw new ApiException('Arquivo não encontrado ou formato inválido.');
        if(str_starts_with($value,'uploads/')&&str_ends_with($value,'.svg'))throw new ApiException('SVG enviado não é permitido.');return $value;
    }
}
