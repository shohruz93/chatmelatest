<?php

class AppController {
    private $db;
    private $appVersion;

    public function __construct($db) {
        $this->db = $db;
        require_once __DIR__ . '/AppVersion.php';
        $this->appVersion = new AppVersion($db);
    }

    public function download() {
        $platform = $_GET['platform'] ?? '';
        
        if (empty($platform)) {
            http_response_code(400);
            echo json_encode(['error' => 'Platform required']);
            return;
        }

        $latest = $this->appVersion->getLatestVersion($platform);

        if (!$latest || empty($latest['file_path'])) {
            http_response_code(404);
            echo json_encode(['error' => 'No version found for this platform']);
            return;
        }

        $filePath = $latest['file_path'];

        // Check if it's a local file stored in our uploads directory
        // The AdminController saves it as: schema://domain/api/public/uploads/apps/filename
        if (strpos($filePath, '/api/public/uploads/apps/') !== false) {
            $parts = explode('/api/public/uploads/apps/', $filePath);
            if (count($parts) > 1) {
                $fileName = end($parts);
                $localPath = __DIR__ . '/../public/uploads/apps/' . $fileName;

                if (file_exists($localPath)) {
                    $this->serveFile($localPath, $fileName);
                    return;
                } else {
                    // Fallback: File record exists but file missing on disk?
                    // Maybe just redirect to the URL and hope server handles it, or 404.
                    // If we try to redirect to the same URL that is failing (404), it won't help.
                    http_response_code(404);
                    echo json_encode(['error' => 'File not found on server']);
                    return;
                }
            }
        }

        // External URL or unable to parse local path -> Redirect
        header("Location: " . $filePath);
        exit;
    }

    private function serveFile($path, $fileName) {
        if (file_exists($path)) {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($fileName) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($path));
            readfile($path);
            exit;
        }
    }
}
