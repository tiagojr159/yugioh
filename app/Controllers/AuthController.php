<?php
namespace App\Controllers;
use App\Core\Request;
use App\Services\AuthService;
final class AuthController
{
    public function register(Request $r): array { return (new AuthService())->register($r->data); }
    public function login(Request $r): array { return (new AuthService())->login($r->data); }
    public function guest(Request $r): array { if(isset($_SESSION['user_id']))return \App\Models\User::publicData(\App\Middleware\Auth::user());return (new AuthService())->register(['name'=>'Duelista','email'=>'guest_'.bin2hex(random_bytes(12)).'@arcana.invalid','password'=>bin2hex(random_bytes(20))],true); }
    public function logout(Request $r): array { $_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));return ['csrf'=>$_SESSION['csrf']]; }
    public function session(Request $r): array
    {
        $user=isset($_SESSION['user_id'])?\App\Models\User::publicData(\App\Middleware\Auth::user()):null;$active=null;
        if($user){$q=\App\Core\Database::connection()->prepare("SELECT id FROM battles WHERE user_id=? AND status='active' ORDER BY id DESC LIMIT 1");$q->execute([$user['id']]);$active=$q->fetchColumn() ?: null;}
        return ['csrf'=>$_SESSION['csrf'],'user'=>$user,'active_battle'=>$active?(int)$active:null];
    }
}
