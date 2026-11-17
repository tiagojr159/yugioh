<?php
declare(strict_types=1);
if (PHP_VERSION_ID < 80200) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<h1>ARCANA precisa de PHP 8.2 ou superior</h1><p>Este servidor usa PHP ' . htmlspecialchars(PHP_VERSION) . '. Consulte o README para iniciar o runtime portátil ou atualizar o servidor.</p>';
    exit;
}
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->run();
