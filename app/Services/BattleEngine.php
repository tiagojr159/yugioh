<?php
namespace App\Services;
use App\Core\ApiException;
use App\Models\Monster;
/** Regras puras: nenhuma leitura de HTTP, banco ou renderização. */
final class BattleEngine
{
    public function __construct(private readonly array $cards,private readonly DamageCalculator $damage=new DamageCalculator()) {}
    public function start(array $playerDeck,array $aiDeck): array
    {
        shuffle($playerDeck);shuffle($aiDeck);
        $side=fn($deck)=>['hp'=>4000,'energy'=>3,'max_energy'=>3,'hand'=>array_splice($deck,0,5),'deck'=>$deck,'field'=>[],'summoned'=>false,'fatigue'=>0];
        $s=['status'=>'active','winner'=>null,'turn'=>1,'active_side'=>'player','next_unit'=>1,'damage_dealt'=>0,'events'=>[],'player'=>$side($playerDeck),'ai'=>$side($aiDeck)];
        $this->event($s,'turn',['side'=>'player']);return $s;
    }
    public function summon(array &$s,string $side,int $cardId): void
    {
        $this->requireTurn($s,$side);$p=&$s[$side];$card=$this->cards[$cardId] ?? null;$index=array_search($cardId,$p['hand'],true);
        if(!$card || $index===false)throw new ApiException('Esta carta não está na sua mão.');
        if($p['summoned'])throw new ApiException('Você já invocou uma criatura neste turno.');
        if(count($p['field'])>=config('game')['max_monsters'])throw new ApiException('Seu campo já tem três criaturas.');
        if($p['energy']<$card['cost'])throw new ApiException('Energia insuficiente para esta invocação.');
        array_splice($p['hand'],$index,1);$p['energy']-=$card['cost'];$p['summoned']=true;
        $monster=Monster::summon($card,$s['next_unit']++);$p['field'][]=$monster;
        $this->event($s,'summon',['side'=>$side,'monster'=>$monster,'card_id'=>$cardId]);
    }
    public function attack(array &$s,string $side,int $attackerId,?int $targetId): void
    {
        $this->requireTurn($s,$side);$enemy=$side==='player'?'ai':'player';$attackerIndex=$this->unitIndex($s[$side]['field'],$attackerId);$a=&$s[$side]['field'][$attackerIndex];
        if($a['attacked'])throw new ApiException('Esta criatura já atacou neste turno.');
        $target=null;$targetIndex=null;
        if(count($s[$enemy]['field'])>0){if($targetId===null)throw new ApiException('Escolha uma criatura adversária.');$targetIndex=$this->unitIndex($s[$enemy]['field'],$targetId);$target=$s[$enemy]['field'][$targetIndex];}
        elseif($targetId!==null)throw new ApiException('O alvo não está mais no campo.');
        $result=$this->damage->calculate($a,$target,$s['turn']);$a['attacked']=true;
        $this->event($s,'attack',['side'=>$side,'attacker_id'=>$attackerId,'target_id'=>$targetId,'damage'=>$result['damage'],'card_id'=>$a['card_id']]);
        $dealt=$result['damage'];
        if($targetIndex!==null){
            $dealt=min($result['damage'],$s[$enemy]['field'][$targetIndex]['hp']);$s[$enemy]['field'][$targetIndex]['hp']=max(0,$target['hp']-$result['damage']);
            if($a['ability']==='frost')$s[$enemy]['field'][$targetIndex]['weakened_until']=$s['turn']+1;
            if($s[$enemy]['field'][$targetIndex]['hp']===0){$this->event($s,'defeat',['side'=>$enemy,'monster_id'=>$targetId,'card_id'=>$target['card_id']]);array_splice($s[$enemy]['field'],$targetIndex,1);}
        }
        $direct=$result['overflow']+$result['piercing'];$actualDirect=min($s[$enemy]['hp'],$direct);
        if($direct>0){$actual=min($s[$enemy]['hp'],$direct);$s[$enemy]['hp']=max(0,$s[$enemy]['hp']-$direct);$this->event($s,'damage',['side'=>$enemy,'amount'=>$actual,'hp'=>$s[$enemy]['hp']]);}
        if($side==='player')$s['damage_dealt']+=($target?$dealt:0)+$actualDirect;
        if($a['ability']==='lifesteal'){$heal=min(4000-$s[$side]['hp'],(int)floor((($target?$dealt:0)+$actualDirect)*0.25));$s[$side]['hp']+=$heal;if($heal)$this->event($s,'heal',['side'=>$side,'amount'=>$heal,'hp'=>$s[$side]['hp']]);}
        $this->checkVictory($s);
    }
    public function endTurn(array &$s): void
    {
        $this->requireTurn($s,'player');$this->beginTurn($s,'ai');if($s['status']!=='active')return;
        // IA local executada exclusivamente no servidor.
        $affordable=array_values(array_filter($s['ai']['hand'],fn($id)=>isset($this->cards[$id])&&$this->cards[$id]['cost']<=$s['ai']['energy']));
        usort($affordable,fn($a,$b)=>$this->cards[$b]['attack']<=>$this->cards[$a]['attack']);
        if($affordable && count($s['ai']['field'])<3)$this->summon($s,'ai',$affordable[0]);
        foreach(array_column($s['ai']['field'],'id') as $id){
            if($s['status']!=='active')break;
            $targets=$s['player']['field'];usort($targets,fn($a,$b)=>$a['hp']<=>$b['hp']);$this->attack($s,'ai',$id,$targets[0]['id'] ?? null);
        }
        if($s['status']==='active')$this->beginTurn($s,'player');
    }
    public function endHumanTurn(array &$s,string $side): void
    {
        $this->requireTurn($s,$side);
        $this->beginTurn($s,$side==='player'?'ai':'player');
    }
    private function beginTurn(array &$s,string $side): void
    {
        $s['turn']++;$s['active_side']=$side;$p=&$s[$side];$p['summoned']=false;$p['max_energy']=min(10,3+(int)floor(($s['turn']-1)/2));$p['energy']=$p['max_energy'];
        foreach($p['field'] as &$m){$m['attacked']=false;if($m['ability']==='regenerate' && $m['hp']<$m['max_hp']){$m['hp']=min($m['max_hp'],$m['hp']+200);$this->event($s,'regenerate',['side'=>$side,'monster_id'=>$m['id'],'hp'=>$m['hp']]);}}unset($m);
        $this->event($s,'turn',['side'=>$side]);
        if($p['deck']){$draw=array_shift($p['deck']);if(count($p['hand'])<10){$p['hand'][]=$draw;$this->event($s,'draw',['side'=>$side,'card_id'=>$draw]);}else{$this->event($s,'discard',['side'=>$side,'card_id'=>$draw]);}}
        else{$p['fatigue']++;$loss=200*$p['fatigue'];$p['hp']=max(0,$p['hp']-$loss);$this->event($s,'fatigue',['side'=>$side,'amount'=>$loss,'hp'=>$p['hp']]);}
        if($s['turn']>=config('game')['max_turns'] && $s['player']['hp']>0 && $s['ai']['hp']>0){$loser=$s['player']['hp']>$s['ai']['hp']?'ai':'player';$s[$loser]['hp']=0;}
        $this->checkVictory($s);
    }
    private function checkVictory(array &$s): void
    {
        if($s['player']['hp']>0&&$s['ai']['hp']>0)return;
        $s['status']='finished';$s['winner']=$s['ai']['hp']<=0?'player':'ai';$this->event($s,'victory',['side'=>$s['winner']]);
    }
    private function requireTurn(array $s,string $side): void { if($s['status']!=='active')throw new ApiException('Esta partida já terminou.');if($s['active_side']!==$side)throw new ApiException('Aguarde seu turno.'); }
    private function unitIndex(array $field,int $id): int { foreach($field as $index=>$m)if($m['id']===$id)return $index;throw new ApiException('Criatura não encontrada no campo.'); }
    private function event(array &$s,string $type,array $data): void { $s['events'][]=['type'=>$type,'turn'=>$s['turn']]+$data; }
}
