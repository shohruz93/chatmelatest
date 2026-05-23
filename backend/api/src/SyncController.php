<?php
require_once __DIR__ . '/Database.php';

class SyncController {
    private $conn;
    private $syncSecret;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
        
        // Define a strong sync secret key
        $this->syncSecret = "ChatmeSuperSecretSyncKey2026";
    }

    private function verifyAuth() {
        $headers = getallheaders();
        $token = $headers['X-Sync-Token'] ?? $headers['x-sync-token'] ?? '';
        if ($token !== $this->syncSecret) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized sync request']);
            exit();
        }
    }

    /**
     * GET /sync/pull
     * Pulls the database schema, all data, and list of uploads
     */
    public function pull() {
        $this->verifyAuth();
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        // Enable Gzip output compression to reduce network payload size by 90%
        $ae = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
        if (strpos($ae, 'gzip') !== false) {
            ob_start("ob_gzhandler");
        } else {
            ob_start();
        }

        try {
            $data = [
                'tables' => [],
                'schemas' => [],
                'files' => []
            ];

            // 1. Get all table names
            $stmt = $this->conn->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($tables as $table) {
                // Fetch create schema
                $schemaStmt = $this->conn->query("SHOW CREATE TABLE `$table`");
                $schemaInfo = $schemaStmt->fetch(PDO::FETCH_ASSOC);
                $data['schemas'][$table] = $schemaInfo['Create Table'];

                // Fetch all data
                $dataStmt = $this->conn->query("SELECT * FROM `$table`");
                $data['tables'][$table] = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // 2. Scan uploads folder recursively
            $uploadsDir = __DIR__ . '/../public/uploads';
            if (!is_dir($uploadsDir)) {
                $uploadsDir = __DIR__ . '/../public_html/uploads';
            }
            if (!is_dir($uploadsDir) && isset($_SERVER['DOCUMENT_ROOT'])) {
                $uploadsDir = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . '/uploads';
            }
            if (!is_dir($uploadsDir)) {
                $uploadsDir = __DIR__ . '/../../public_html/uploads';
            }
            if (!is_dir($uploadsDir)) {
                $uploadsDir = __DIR__ . '/../../../public_html/uploads';
            }

            if (is_dir($uploadsDir)) {
                $files = $this->scanDirectory($uploadsDir);
                $data['files'] = $files;
            }

            header('Content-Type: application/json');
            // Remove JSON_PRETTY_PRINT to reduce JSON string size by 40%
            echo json_encode($data, JSON_UNESCAPED_UNICODE);
            ob_end_flush();
        } catch (Exception $e) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * POST /sync/push
     * Pushes local changes back to the cloud database
     */
    public function push() {
        $this->verifyAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['tables'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid sync data payload']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            foreach ($input['tables'] as $table => $rows) {
                if (empty($rows)) continue;

                // Dynamically build INSERT INTO ... ON DUPLICATE KEY UPDATE query
                $columns = array_keys($rows[0]);
                $colList = implode(', ', array_map(function($c) { return "`$c`"; }, $columns));
                
                $placeholders = implode(', ', array_map(function($c) { return ":$c"; }, $columns));
                
                $updateList = implode(', ', array_map(function($c) {
                    return "`$c` = VALUES(`$c`)";
                }, $columns));

                $query = "INSERT INTO `$table` ($colList) VALUES ($placeholders) ON DUPLICATE KEY UPDATE $updateList";
                $stmt = $this->conn->prepare($query);

                foreach ($rows as $row) {
                    $params = [];
                    foreach ($columns as $col) {
                        $params[":$col"] = $row[$col] ?? null;
                    }
                    $stmt->execute($params);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Sync push completed successfully']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private function scanDirectory($dir, $baseDir = null) {
        if ($baseDir === null) {
            $baseDir = $dir;
        }
        
        $result = [];
        $items = scandir($dir);

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;

            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $result = array_merge($result, $this->scanDirectory($path, $baseDir));
            } else {
                $relPath = ltrim(str_replace($baseDir, '', $path), '/\\');
                $result[] = [
                    'path' => str_replace('\\', '/', $relPath),
                    'size' => filesize($path),
                    'mtime' => filemtime($path)
                ];
            }
        }
        return $result;
    }
}
