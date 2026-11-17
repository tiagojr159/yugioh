<?php
declare(strict_types=1);
namespace App\Core;
final class Application
{
    public function run(): void
    {
        try {
            $this->headers();
            $this->session();
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
            if ($base && str_starts_with($path, $base . '/')) { $path = substr($path, strlen($base)); }
            $request = new Request($_SERVER['REQUEST_METHOD'] ?? 'GET', rtrim($path, '/') ?: '/');
            if (!in_array($request->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
                $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
                if (!hash_equals($_SESSION['csrf'], $token)) { throw new ApiException('Sua sessão expirou. Recarregue a página.', 419); }
                \App\Middleware\RateLimit::check($request->path, (str_starts_with($request->path, '/api/auth/') || $request->path === '/install') ? 15 : 90);
            }
            $router = new Router();
            require BASE_PATH . '/routes/api.php';
            require BASE_PATH . '/routes/web.php';
            $result = $router->dispatch($request);
            if ($result !== null) { $this->json(['ok' => true, 'data' => $result]); }
        } catch (ApiException $e) { $this->json(['ok' => false, 'error' => ['message' => $e->getMessage(), 'details' => $e->details]], $e->status); }
        catch (\Throwable $e) {
            $id = bin2hex(random_bytes(6));
            error_log(date('c') . " [$id] " . get_class($e) . ': ' . $e->getMessage() . PHP_EOL, 3, BASE_PATH . '/storage/logs/app.log');
            $this->json(['ok' => false, 'error' => ['message' => 'Não foi possível concluir. Verifique a instalação e tente novamente.', 'reference' => $id]], 500);
        }
    }
    private function headers(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: same-origin');
        header('Permissions-Policy: camera=(self), microphone=(), xr-spatial-tracking=(self)');
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    }
    private function session(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) { return; }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('arcana_session');
        session_save_path(BASE_PATH . '/storage/sessions');
        session_set_cookie_params(['httponly' => true, 'secure' => config('app')['secure'], 'samesite' => 'Lax', 'path' => '/']);
        session_start();
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }
    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
