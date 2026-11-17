<?php
namespace App\Models;
final class Deck { public static function expand(array $cards): array { $out=[]; foreach($cards as $card) { $out=array_merge($out,array_fill(0,(int)$card['quantity'],(int)$card['card_id'])); } return $out; } }
