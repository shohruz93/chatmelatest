<?php

class Config {
    private static $config = [];

    public static function load() {
        // Try looking in the parent directory (backend/api/) and root
        $dotenvPath = __DIR__ . '/../.env';
        if (!is_readable($dotenvPath)) {
            $dotenvPath = __DIR__ . '/../../.env';
        }
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

// If certain mail env vars are not set (or you prefer hardcoding), set them here.
// WARNING: Hardcoding secrets in code is not recommended for production.
if (!getenv('SMTP_HOST')) {
    putenv('MAIL_FROM=no-reply@chatme.tj');
    putenv('MAIL_FROM_NAME=Chatme');
    putenv('SMTP_HOST=mail.chatme.tj');
    putenv('SMTP_PORT=587');
    putenv('SMTP_USER=no-reply@chatme.tj');
    putenv('SMTP_PASS=A900434231z');
    putenv('SMTP_SECURE=tls');
    // Also populate $_ENV and $_SERVER for consistency
    $_ENV['MAIL_FROM'] = 'no-reply@chatme.tj';
    $_ENV['MAIL_FROM_NAME'] = 'Chatme';
    $_ENV['SMTP_HOST'] = 'mail.chatme.tj';
    $_ENV['SMTP_PORT'] = '587';
    $_ENV['SMTP_USER'] = 'no-reply@chatme.tj';
    $_ENV['SMTP_PASS'] = 'A900434231z';
    $_ENV['SMTP_SECURE'] = 'tls';
    $_SERVER['MAIL_FROM'] = 'no-reply@chatme.tj';
    $_SERVER['MAIL_FROM_NAME'] = 'Chatme';
    $_SERVER['SMTP_HOST'] = 'mail.chatme.tj';
    $_SERVER['SMTP_PORT'] = '587';
    $_SERVER['SMTP_USER'] = 'no-reply@chatme.tj';
    $_SERVER['SMTP_PASS'] = 'A900434231z';
    $_SERVER['SMTP_SECURE'] = 'tls';
}
