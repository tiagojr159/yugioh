<?php
declare(strict_types=1);
namespace App\Core;
final class Router
{
    private array $routes = [];
    public function add(string $method, string $path, array|callable $handler, bool $authenticated = true, bool $admin = false): void { $this->routes[] = compact('method', 'path', 'handler', 'authenticated', 'admin'); }
    public function dispatch(Request $request): mixed
    {
        foreach ($this->routes as $route) {
            $pattern = '#^' . preg_replace('/\{[a-z_]+\}/', '([0-9]+)', $route['path']) . '$#';
            if ($route['method'] !== $request->method || !preg_match($pattern, $request->path, $matches)) { continue; }
            if ($route['authenticated']) { \App\Middleware\Auth::user(); }
            if ($route['admin']) { \App\Middleware\Auth::admin(); }
            array_shift($matches);
            $handler = $route['handler'];
            if (is_array($handler)) { $handler = [new $handler[0](), $handler[1]]; }
            return $handler($request, ...array_map('intval', $matches));
        }
        throw new ApiException('Rota não encontrada.', 404);
    }
}
