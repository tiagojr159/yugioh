<?php
namespace App\Services;
final class DamageCalculator
{
    public function calculate(array $attacker,?array $target,int $turn): array
    {
        $attack=max(0,$attacker['attack']-(($attacker['weakened_until'] ?? 0)>=$turn?200:0));
        $attack+=($attacker['ability'] ?? '')==='burn'?120:0;
        $defense=$target ? $target['defense']+(($target['ability'] ?? '')==='shield'?200:0) : 0;
        $damage=max(100,$attack-$defense);
        return ['damage'=>$damage,'overflow'=>$target?max(0,$damage-$target['hp']):$damage,'piercing'=>$target && ($attacker['ability'] ?? '')==='pierce'?160:0];
    }
}
