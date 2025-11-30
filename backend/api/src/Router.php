<?php

class Router {
    private $routes = [];

    public function add($method, $path, $callback) {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'callback' => $callback
        ];
    }

    public function dispatch($method, $uri) {
        // Remove query string
        $uri = parse_url($uri, PHP_URL_PATH);
        // Remove /api prefix if present (depending on server config)
        $uri = str_replace('/api', '', $uri);

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $route['path'] === $uri) {
                call_user_func($route['callback']);
                return;
            }
        }

        header("HTTP/1.0 404 Not Found");
        echo json_encode(['error' => 'Route not found']);
    }
}
