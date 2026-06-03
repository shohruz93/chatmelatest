<?php

class Cache {
    private static $cache_dir = __DIR__ . '/../cache';

    private static function init() {
        if (!is_dir(self::$cache_dir)) {
            @mkdir(self::$cache_dir, 0777, true);
        }
    }

    private static function getFilePath($key) {
        $prefix = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($key, 0, 50));
        return self::$cache_dir . '/cache_' . $prefix . '_' . md5($key) . '.cache';
    }

    public static function get($key) {
        self::init();
        $file = self::getFilePath($key);
        if (file_exists($file)) {
            $data = @file_get_contents($file);
            if ($data === false) {
                return null;
            }
            $cached = unserialize($data);
            if ($cached && isset($cached['expire']) && $cached['expire'] > time()) {
                return $cached['data'];
            }
            // Expired or corrupt, delete it
            @unlink($file);
        }
        return null;
    }

    public static function set($key, $data, $ttl = 3600) {
        self::init();
        $file = self::getFilePath($key);
        $cached = [
            'expire' => time() + $ttl,
            'data' => $data
        ];
        return @file_put_contents($file, serialize($cached)) !== false;
    }

    public static function delete($key) {
        self::init();
        $file = self::getFilePath($key);
        if (file_exists($file)) {
            return @unlink($file);
        }
        return false;
    }

    public static function deleteByPrefix($prefix) {
        self::init();
        $sanitizedPrefix = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $prefix);
        $files = glob(self::$cache_dir . '/cache_' . $sanitizedPrefix . '*.cache');
        if ($files) {
            foreach ($files as $file) {
                if (is_file($file)) {
                    @unlink($file);
                }
            }
        }
        return true;
    }

    public static function clear() {
        self::init();
        $files = glob(self::$cache_dir . '/*.cache');
        if ($files) {
            foreach ($files as $file) {
                if (is_file($file)) {
                    @unlink($file);
                }
            }
        }
        return true;
    }
}
