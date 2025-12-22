<?php

class Config {
    private static $config = [];

    public static function load() {
        $dotenvPath = __DIR__ . '/../../.env';
        if (is_readable($dotenvPath)) {
            $lines = file($dotenvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }

                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }

    public static function get($key, $default = null) {
        if ($value = getenv($key)) {
            return $value;
        }
        return $default;
    }
}

// Load the config on inclusion
Config::load();
