<?php
namespace App\Services;
use App\Core\Database;
final class PlayerService
{
    public function provision(int $userId): void
    {
        $pdo=Database::connection();$cards=(new \App\Repositories\CardRepository())->all();
        foreach($cards as $card) { $pdo->prepare('INSERT INTO user_cards(user_id,card_id,quantity) VALUES (?,?,3)')->execute([$userId,$card['id']]); }
        $pdo->prepare('INSERT INTO player_statistics(user_id) VALUES (?)')->execute([$userId]);
        $pdo->prepare('INSERT INTO decks(user_id,name) VALUES (?,?)')->execute([$userId,'Ecos dos seis reinos']);$deckId=(int)$pdo->lastInsertId();
        foreach($cards as $card) { $pdo->prepare('INSERT INTO deck_cards(deck_id,card_id,quantity) VALUES (?,?,2)')->execute([$deckId,$card['id']]); }
    }
    public function statistics(int $id): array { $q=Database::connection()->prepare('SELECT * FROM player_statistics WHERE user_id=?');$q->execute([$id]);return array_map('intval',$q->fetch() ?: []); }
    public function record(int $id,array $state): void
    {
        $won=$state['winner']==='player';Database::connection()->prepare('UPDATE player_statistics SET battles=battles+1,wins=wins+?,losses=losses+?,damage_dealt=damage_dealt+?,experience=experience+? WHERE user_id=?')->execute([(int)$won,(int)!$won,$state['damage_dealt'],$won?250:75,$id]);
    }
}
