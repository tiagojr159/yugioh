<?php
namespace App\Models;
final class Monster
{
    public static function summon(array $card, int $id): array
    {
        return ['id'=>$id,'card_id'=>$card['id'],'name'=>$card['name'],'hp'=>$card['hp'],'max_hp'=>$card['hp'],'attack'=>$card['attack'],'defense'=>$card['defense'],'ability'=>$card['abilities'][0]['code'] ?? '', 'attacked'=>false,'weakened_until'=>0];
    }
}
