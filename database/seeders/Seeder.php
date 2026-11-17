<?php
namespace Database;
use App\Core\Database;
final class Seeder
{
    public static function run(): void
    {
        Database::transaction(function ($pdo) {
            foreach (require BASE_PATH . '/database/seeders/cards.php' as $card) {
                $q = $pdo->prepare('SELECT id FROM cards WHERE slug=?'); $q->execute([$card['slug']]);
                if ($q->fetch()) { continue; }
                $q = $pdo->prepare('INSERT INTO cards(slug,name,description,element,rarity,cost,image_url,marker_url,color) VALUES (?,?,?,?,?,?,?,?,?)');
                $q->execute([$card['slug'],$card['name'],$card['description'],$card['element'],$card['rarity'],$card['cost'],'assets/cards/'.$card['slug'].'.svg','markers/'.$card['slug'].'.patt',$card['color']]);
                $id = (int)$pdo->lastInsertId();
                $pdo->prepare('INSERT INTO monsters(card_id,attack,defense,hp,archetype,animations) VALUES (?,?,?,?,?,?)')->execute([$id,$card['attack'],$card['defense'],$card['hp'],$card['archetype'],json_encode(['idle','summon','attack','hit','defeat'])]);
                $a=$card['ability'];
                $pdo->prepare('INSERT INTO card_abilities(card_id,code,name,description) VALUES (?,?,?,?)')->execute([$id,$a['code'],$a['name'],$a['description']]);
            }
        });
        echo "Seis cartas originais disponíveis.\n";
    }
}
