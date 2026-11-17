<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Validators\Input;
final class DeckService
{
    public function all(int $userId): array
    {
        $pdo=Database::connection();$q=$pdo->prepare('SELECT * FROM decks WHERE user_id=? ORDER BY id');$q->execute([$userId]);$decks=$q->fetchAll();
        foreach($decks as &$deck) { $deck['id']=(int)$deck['id'];$q=$pdo->prepare('SELECT dc.card_id,dc.quantity FROM deck_cards dc JOIN cards c ON c.id=dc.card_id WHERE deck_id=? AND c.active=1 ORDER BY dc.card_id');$q->execute([$deck['id']]);$deck['cards']=array_map(fn($r)=>array_map('intval',$r),$q->fetchAll());$deck['count']=array_sum(array_column($deck['cards'],'quantity')); }
        return $decks;
    }
    public function find(int $id,int $userId): array { foreach($this->all($userId) as $d)if($d['id']===$id)return $d;throw new ApiException('Deck não encontrado.',404); }
    public function save(int $userId,array $data,?int $id=null): array
    {
        if($id!==null)$this->find($id,$userId);
        $name=Input::text($data,'name',2,60);$cards=$data['cards'] ?? null;
        if(!is_array($cards)||count($cards)>30)throw new ApiException('Lista de cartas inválida.');
        $available=[];foreach((new \App\Repositories\CardRepository())->collection($userId) as $c)$available[(int)$c['card_id']]=(int)$c['quantity'];
        $active=array_column((new \App\Repositories\CardRepository())->all(),'id');$seen=[];$total=0;
        foreach($cards as $card) {
            if(!is_array($card))throw new ApiException('Carta inválida.');
            $cid=Input::integer($card,'card_id',1,PHP_INT_MAX);$qty=Input::integer($card,'quantity',1,3);
            if(isset($seen[$cid])||!in_array($cid,$active,true)||($available[$cid] ?? 0)<$qty)throw new ApiException('Carta repetida, inativa ou fora da sua coleção.');$seen[$cid]=$qty;$total+=$qty;
        }
        if($total<config('game')['deck_min']||$total>config('game')['deck_max'])throw new ApiException('O deck precisa ter entre 12 e 30 cartas, até 3 cópias de cada.');
        $id=Database::transaction(function($pdo)use($id,$userId,$name,$seen){
            if($id===null){$q=$pdo->prepare('SELECT COUNT(*) FROM decks WHERE user_id=?');$q->execute([$userId]);if((int)$q->fetchColumn()>=12)throw new ApiException('Limite de 12 decks atingido.');$pdo->prepare('INSERT INTO decks(user_id,name) VALUES (?,?)')->execute([$userId,$name]);$id=(int)$pdo->lastInsertId();}
            else{$pdo->prepare('UPDATE decks SET name=? WHERE id=? AND user_id=?')->execute([$name,$id,$userId]);$pdo->prepare('DELETE FROM deck_cards WHERE deck_id=?')->execute([$id]);}
            foreach($seen as $cid=>$qty)$pdo->prepare('INSERT INTO deck_cards(deck_id,card_id,quantity) VALUES (?,?,?)')->execute([$id,$cid,$qty]);return $id;
        });return $this->find($id,$userId);
    }
}
