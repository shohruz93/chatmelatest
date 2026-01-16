<?php

/**
 * Error Handling Middleware
 * Catches all errors and exceptions, logs them to a file, and returns clean JSON responses
 */
class ErrorMiddleware {
    private static $logFile;
    private static $initialized = false;

    /**
     * Initialize the error handling middleware
     */
    public static function init() {
        if (self::$initialized) {
            return;
        }

        // Set log file path
        self::$logFile = __DIR__ . '/../logs/error.log';
        
        // Disable error display and enable logging
        ini_set('display_errors', 0);
        ini_set('display_startup_errors', 0);
        ini_set('log_errors', 1);
        error_reporting(E_ALL);
        
        // Create logs directory if it doesn't exist
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        // Set custom error handler
        set_error_handler([self::class, 'handleError']);
        
        // Set custom exception handler
        set_exception_handler([self::class, 'handleException']);
        
        // Register shutdown function for fatal errors
        register_shutdown_function([self::class, 'handleShutdown']);

        self::$initialized = true;
    }

    /**
     * Handle PHP errors
     */
    public static function handleError($errno, $errstr, $errfile, $errline) {
        $errorTypes = [
            E_ERROR => 'ERROR',
            E_WARNING => 'WARNING',
            E_PARSE => 'PARSE',
            E_NOTICE => 'NOTICE',
            E_CORE_ERROR => 'CORE_ERROR',
            E_CORE_WARNING => 'CORE_WARNING',
            E_COMPILE_ERROR => 'COMPILE_ERROR',
            E_COMPILE_WARNING => 'COMPILE_WARNING',
            E_USER_ERROR => 'USER_ERROR',
            E_USER_WARNING => 'USER_WARNING',
            E_USER_NOTICE => 'USER_NOTICE',
            E_STRICT => 'STRICT',
            E_RECOVERABLE_ERROR => 'RECOVERABLE_ERROR',
            E_DEPRECATED => 'DEPRECATED',
            E_USER_DEPRECATED => 'USER_DEPRECATED',
        ];

        $type = $errorTypes[$errno] ?? 'UNKNOWN';
        
        // Log the error
        self::log($type, $errstr, $errfile, $errline);

        // For fatal errors, throw exception
        if (in_array($errno, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR])) {
            throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
        }

        // Return false to let PHP handle non-fatal errors normally
        return false;
    }

    /**
     * Handle uncaught exceptions
     */
    public static function handleException($exception) {
        // Log the exception
        self::log(
            'EXCEPTION',
            $exception->getMessage(),
            $exception->getFile(),
            $exception->getLine(),
            $exception->getTraceAsString()
        );

        // Send JSON error response
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
        }

        echo json_encode([
            'error' => true,
            'message' => 'An internal server error occurred',
            'details' => self::isDebugMode() ? $exception->getMessage() : null
        ]);

        exit(1);
    }

    /**
     * Handle fatal errors on shutdown
     */
    public static function handleShutdown() {
        $error = error_get_last();
        
        if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
            self::log(
                'FATAL',
                $error['message'],
                $error['file'],
                $error['line']
            );

            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json');
            }

            echo json_encode([
                'error' => true,
                'message' => 'A fatal error occurred',
                'details' => self::isDebugMode() ? $error['message'] : null
            ]);
        }
    }

    /**
     * Log error to file
     */
    private static function log($type, $message, $file = null, $line = null, $trace = null) {
        $timestamp = date('Y-m-d H:i:s');
        $requestUri = $_SERVER['REQUEST_URI'] ?? 'CLI';
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'CLI';

        $logEntry = "[$timestamp] [$type] [$requestMethod $requestUri] [$clientIp]\n";
        $logEntry .= "Message: $message\n";
        
        if ($file) {
            $logEntry .= "File: $file";
            if ($line) {
                $logEntry .= " (Line: $line)";
            }
            $logEntry .= "\n";
        }
        
        if ($trace) {
            $logEntry .= "Stack Trace:\n$trace\n";
        }
        
        $logEntry .= str_repeat('-', 80) . "\n\n";

        // Write to log file
        file_put_contents(self::$logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log a custom message (can be used for info/debug logging)
     */
    public static function logInfo($message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $requestUri = $_SERVER['REQUEST_URI'] ?? 'CLI';
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'CLI';

        $logEntry = "[$timestamp] [INFO] [$requestMethod $requestUri]\n";
        $logEntry .= "Message: $message\n";
        
        if (!empty($context)) {
            $logEntry .= "Context: " . json_encode($context) . "\n";
        }
        
        $logEntry .= str_repeat('-', 80) . "\n\n";

        file_put_contents(self::$logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log request details (for debugging)
     */
    public static function logRequest() {
        $timestamp = date('Y-m-d H:i:s');
        $requestUri = $_SERVER['REQUEST_URI'] ?? 'CLI';
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'CLI';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        $logEntry = "[$timestamp] [REQUEST] [$requestMethod $requestUri] [$clientIp]\n";
        $logEntry .= "User-Agent: $userAgent\n";
        $logEntry .= str_repeat('-', 80) . "\n\n";

        file_put_contents(self::$logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Check if debug mode is enabled
     */
    private static function isDebugMode() {
        return defined('DEBUG_MODE') && DEBUG_MODE === true;
    }

    /**
     * Get the log file path
     */
    public static function getLogFile() {
        return self::$logFile;
    }
}
