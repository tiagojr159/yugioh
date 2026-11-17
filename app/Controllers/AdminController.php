<?php
namespace App\Controllers;
use App\Core\{Request,Database};
final class AdminController
{
    public function cards(Request $r): array { return (new \App\Repositories\CardRepository())->all(true); }
    public function create(Request $r): array { return (new \App\Services\CardService())->save($r->data); }
    public function update(Request $r,int $id): array { return (new \App\Services\CardService())->save($r->data,$id); }
    public function upload(Request $r): array { return (new \App\Services\UploadService())->store($_FILES['file'] ?? []); }
    public function overview(Request $r): array
    {
        $pdo=Database::connection();return ['players'=>$pdo->query('SELECT id,name,email,role,is_guest,created_at FROM users ORDER BY id DESC LIMIT 100')->fetchAll(),'battles'=>$pdo->query('SELECT b.id,u.name,b.status,b.version,b.created_at FROM battles b JOIN users u ON u.id=b.user_id ORDER BY b.id DESC LIMIT 100')->fetchAll()];
    }
}
