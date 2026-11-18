<?php
namespace App\Services;
use App\Core\{Database,ApiException};
use App\Repositories\UserRepository;
use App\Validators\Input;
use App\Models\User;
final class AuthService
{
    public function register(array $data,bool $guest=false): array
    {
        $name=Input::text($data,'name',2,60);$email=strtolower(Input::text($data,'email',5,190));$password=Input::text($data,'password',3,128);
        if(!filter_var($email,FILTER_VALIDATE_EMAIL))throw new ApiException('Informe um e-mail válido.');
        $repo=new UserRepository();if($repo->byEmail($email))throw new ApiException('Não foi possível cadastrar este e-mail.');
        $id=Database::transaction(function()use($repo,$name,$email,$password,$guest){$id=$repo->create($name,$email,password_hash($password,PASSWORD_DEFAULT),$guest);(new PlayerService())->provision($id);return $id;});
        $this->session($id);return User::publicData($repo->find($id));
    }
    public function login(array $data): array
    {
        $email=strtolower(Input::text($data,'email',5,190));$password=Input::text($data,'password',1,128);$user=(new UserRepository())->byEmail($email);
        $dummy='$2y$10$KZdxjvT/xs8wqOrLxAW5DuxUbvE84i1ju2N1Nq6zcysDziLZ9Bauy';
        if(!password_verify($password,$user['password_hash'] ?? $dummy) || !$user || $user['is_guest'])throw new ApiException('E-mail ou senha incorretos.',401);
        $this->session((int)$user['id']);return User::publicData($user);
    }
    private function session(int $id): void { if(session_status()===PHP_SESSION_ACTIVE)session_regenerate_id(true);$_SESSION['user_id']=$id; }
}
