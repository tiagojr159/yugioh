<?php
namespace App\Models;
final class Battle
{
    public static function forPlayer(array $state): array
    {
        foreach(['player','ai'] as $side) { $state[$side]['deck_count']=count($state[$side]['deck']); unset($state[$side]['deck']); }
        $state['ai']['hand_count']=count($state['ai']['hand']); unset($state['ai']['hand']);
        return $state;
    }
}
