<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Core\Request;
final class InstallerController
{
    public function index(Request $request): null { require BASE_PATH.'/resources/views/install/index.php';return null; }
    public function install(Request $request): array { return (new \App\Services\InstallerService())->install($request->data); }
}
