<?php
namespace App\Controllers;
use App\Core\{Request,ApiException};
use App\Repositories\CardRepository;
final class CardController
{
    public function index(Request $r): array { return (new CardRepository())->all(); }
    public function show(Request $r,int $id): array { return (new CardRepository())->find($id) ?? throw new ApiException('Carta não encontrada.',404); }
}
