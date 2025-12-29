<?php

class AdminController {
    private $db;
    private $user;
    private $appVersion;

    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
        require_once __DIR__ . '/AppVersion.php';
        $this->appVersion = new AppVersion($db);
    }

    private function isAdmin($userId) {
        $query = "SELECT is_admin FROM users WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user && $user['is_admin'] == 1;
    }

    public function getStats() {
        // Stats queries
        $stats = [];
        
        // Total Users
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users");
        $stats['total_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Active Users (last 24h)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE last_active > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        $stats['active_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Online Users (last 5 min)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
        $stats['online_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // New Users (last 7 days)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $stats['new_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Gender Distribution
        $stmt = $this->db->query("SELECT gender, COUNT(*) as count FROM users GROUP BY gender");
        $stats['gender_distribution'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Total Messages
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM messages");
        $stats['total_messages'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        echo json_encode($stats);
    }

    public function getUsers() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = 10;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $status = isset($_GET['status']) ? $_GET['status'] : 'all'; // all, banned, admin

        $query = "SELECT id, name, first_name, family_name, email, is_admin, status, gender, avatar, created_at, last_active FROM users";
        $countQuery = "SELECT COUNT(*) as count FROM users";
        
        $conditions = [];
        $params = [];
        
        $conditions[] = "1=1"; // Base condition

        if ($search) {
            $conditions[] = "(name LIKE :search OR email LIKE :search)";
            $params[':search'] = "%$search%";
        }
        
        if ($status === 'banned') {
            $conditions[] = "status = 'banned'";
        } elseif ($status === 'admin') {
            $conditions[] = "is_admin = 1";
        } elseif ($status === 'active') {
             $conditions[] = "status != 'banned'";
        }
        
        $whereClause = " WHERE " . implode(" AND ", $conditions);
        
        $query .= $whereClause . " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $countQuery .= $whereClause;
        
        $stmt = $this->db->prepare($query);
        $countStmt = $this->db->prepare($countQuery);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
            $countStmt->bindValue($key, $value);
        }
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $countStmt->execute();
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        echo json_encode([
            'users' => $users,
            'total' => $total,
            'page' => $page,
            'pages' => ceil($total / $limit)
        ]);
    }

    public function banUser() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        $query = "UPDATE users SET status = 'banned' WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $data->user_id);
        
        if($stmt->execute()) {
            echo json_encode(['message' => 'User banned successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to ban user']);
        }
    }

    public function unbanUser() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        $query = "UPDATE users SET status = 'active' WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $data->user_id);
        
        if($stmt->execute()) {
            echo json_encode(['message' => 'User unbanned successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to unban user']);
        }
    }

    public function toggleAdmin() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        // First get current status
        $checkStmt = $this->db->prepare("SELECT is_admin FROM users WHERE id = :id");
        $checkStmt->bindParam(":id", $data->user_id);
        $checkStmt->execute();
        $user = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $newStatus = $user['is_admin'] == 1 ? 0 : 1;

        $query = "UPDATE users SET is_admin = :new_status WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":new_status", $newStatus);
        $stmt->bindParam(":id", $data->user_id);
        
        if($stmt->execute()) {
            echo json_encode(['message' => 'Admin status updated successfully', 'is_admin' => $newStatus]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update admin status']);
        }
    }

    public function getUserDetails() {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        $userId = $_GET['id'];
        
        // Get basic profile
        $userProfile = $this->user->getProfile($userId);
        
        if (!$userProfile) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        // Get interests
        $query = "SELECT i.id, i.name FROM interests i 
                  JOIN user_interests ui ON i.id = ui.interest_id 
                  WHERE ui.user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $userProfile['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get stats for this user
        $statsQuery = "SELECT 
            (SELECT COUNT(*) FROM messages WHERE sender_id = :uid) as messages_sent,
            (SELECT COUNT(DISTINCT CASE WHEN sender_id = :uid THEN receiver_id ELSE sender_id END) 
             FROM messages 
             WHERE sender_id = :uid OR receiver_id = :uid) as total_conversations
        ";
        $statsStmt = $this->db->prepare($statsQuery);
        $statsStmt->bindParam(":uid", $userId);
        $statsStmt->execute();
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
        
        $userProfile['stats'] = $stats;

        echo json_encode($userProfile);
    }

    public function getSupportConversations() {
        $data = json_decode(file_get_contents("php://input"));
        $adminId = isset($data->adminId) ? $data->adminId : null;

        if (!$adminId) {
            // Try to find admin ID if not provided
            $adminUser = $this->user->getAdminUser();
            if ($adminUser) {
                $adminId = $adminUser['id'];
            } else {
                 http_response_code(404);
                 echo json_encode(['error' => 'No admin found']);
                 return;
            }
        }

        // Get recent conversations for this admin
        // We want the user details and the last message
        $query = "
            SELECT 
                u.id as user_id, 
                u.name, 
                u.avatar, 
                u.email,
                m.content as last_message,
                m.created_at as last_message_time,
                (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id = u.id AND m2.receiver_id = :admin_id AND m2.is_read = 0) as unread_count
            FROM users u
            JOIN (
                SELECT 
                    CASE 
                        WHEN sender_id = :admin_id THEN receiver_id 
                        ELSE sender_id 
                    END as other_user_id,
                    MAX(created_at) as max_created_at
                FROM messages
                WHERE sender_id = :admin_id OR receiver_id = :admin_id
                GROUP BY other_user_id
            ) latest_msg ON u.id = latest_msg.other_user_id
            JOIN messages m ON (
                (m.sender_id = :admin_id AND m.receiver_id = u.id) OR 
                (m.sender_id = u.id AND m.receiver_id = :admin_id)
            ) AND m.created_at = latest_msg.max_created_at
            ORDER BY m.created_at DESC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':admin_id', $adminId);
        $stmt->execute();
        $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($conversations);
    }
    public function uploadApp() {
        // Debug logging
        $debugFile = __DIR__ . '/../debug_upload.log';
        $logEntry = date('Y-m-d H:i:s') . "\n";
        $logEntry .= "POST: " . print_r($_POST, true) . "\n";
        $logEntry .= "FILES: " . print_r($_FILES, true) . "\n";
        $logEntry .= "Content-Length: " . $_SERVER['CONTENT_LENGTH'] . "\n";
        file_put_contents($debugFile, $logEntry, FILE_APPEND);

        if (!isset($_FILES['file']) && !isset($_POST['file_url'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded or URL provided']);
            return;
        }

        $platform = $_POST['platform'] ?? '';
        $version = $_POST['version'] ?? '';
        $versionCode = $_POST['version_code'] ?? 0;
        $releaseNotes = $_POST['release_notes'] ?? '';
        
        if (empty($platform) || empty($version) || empty($versionCode)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $filePath = '';

        // Handle File Upload
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../public/uploads/apps/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $fileName = $platform . '_' . $version . '_' . time() . '.' . pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
            $targetFile = $uploadDir . $fileName;

            if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) {
                // Determine public URL
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
                $domain = $_SERVER['HTTP_HOST'];
                // Assuming standard setup, adjust as needed
                $filePath = "$protocol://$domain/api/public/uploads/apps/$fileName";
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to move uploaded file']);
                return;
            }
        } elseif (isset($_POST['file_url'])) {
             $filePath = $_POST['file_url'];
        } else {
             http_response_code(400);
             echo json_encode(['error' => 'File upload error']);
             return;
        }

        if ($this->appVersion->create($platform, $version, $versionCode, $filePath, $releaseNotes)) {
            echo json_encode(['success' => true, 'message' => 'App version uploaded successfully', 'file_path' => $filePath]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Database insertion failed']);
        }
    }

    public function getAppVersions() {
        $versions = $this->appVersion->getAllVersions();
        echo json_encode($versions);
    }
}

