<?php
declare(strict_types=1);
namespace App\Middleware;
use App\Core\ApiException;
final class RateLimit
{
    public static function check(string $route, int $limit): void
    {
        // Arquivo por IP e família de endpoint; flock protege múltiplos workers.
        $auth = str_starts_with($route, '/api/auth');
        $voice = (bool)preg_match('#^/api/multiplayer/rooms/\d+/voice$#', $route);
        // ICE candidates arrive in bursts. Isolate signaling from game actions
        // and distinguish players sharing the same Wi-Fi/public IP.
        $family = $auth ? 'auth' : ($voice ? 'voice' : 'actions');
        $identity = $auth ? '' : ':' . (string)($_SESSION['user_id'] ?? 'anonymous');
        $key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'cli') . ':' . $family . $identity);
        $directory = env('RATE_LIMIT_PATH', BASE_PATH . '/storage/rate-limits');
        if (!is_dir($directory)) { mkdir($directory, 0770, true); }
        $file = fopen($directory . '/' . $key . '.json', 'c+');
        if (!$file) { throw new ApiException('Serviço temporariamente indisponível.', 503); }
        try {
            flock($file, LOCK_EX);
            $state = json_decode(stream_get_contents($file) ?: '{}', true) ?: [];
            if (($state['until'] ?? 0) < time()) { $state = ['until' => time() + 60, 'count' => 0]; }
            if ($state['count'] >= $limit) { if (!headers_sent()) { header('Retry-After: ' . max(1, $state['until'] - time())); } throw new ApiException('Muitas tentativas. Aguarde um minuto.', 429); }
            $state['count']++;
            ftruncate($file, 0); rewind($file); fwrite($file, json_encode($state));
        } finally { flock($file, LOCK_UN); fclose($file); }
    }
}
