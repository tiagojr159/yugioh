<?php
namespace App\Repositories;
use App\Core\Database;
use App\Models\Card;
final class CardRepository
{
    public function all(bool $includeInactive=false): array
    {
        $pdo=Database::connection();
        $rows=$pdo->query('SELECT c.*,m.attack,m.defense,m.hp,m.archetype,m.animations FROM cards c JOIN monsters m ON m.card_id=c.id'.($includeInactive?'':' WHERE c.active=1').' ORDER BY c.id')->fetchAll();
        $abilities=[];
        foreach($pdo->query('SELECT card_id,code,name,description FROM card_abilities')->fetchAll() as $a) { $abilities[$a['card_id']][]=$a; }
        return array_map(fn($r)=>Card::hydrate($r,$abilities[$r['id']] ?? []),$rows);
    }
    public function find(int $id,bool $includeInactive=false): ?array { foreach($this->all($includeInactive) as $card) { if($card['id']===$id) return $card; } return null; }
    public function collection(int $userId): array { $q=Database::connection()->prepare('SELECT card_id,quantity FROM user_cards WHERE user_id=?');$q->execute([$userId]);return $q->fetchAll(); }
}
