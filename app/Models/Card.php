<?php
namespace App\Models;
final class Card
{
    public static function hydrate(array $row, array $abilities = []): array
    {
        foreach (['id','cost','attack','defense','hp','active'] as $key) { if(isset($row[$key])) { $row[$key]=(int)$row[$key]; } }
        $row['animations'] = json_decode($row['animations'] ?? '[]', true);
        $row['abilities'] = $abilities;
        return $row;
    }
}
