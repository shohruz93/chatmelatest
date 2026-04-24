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
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE last_active > (UNIX_TIMESTAMP() - 86400)");
        $stats['active_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Online Users (last 5 min)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE last_active > (UNIX_TIMESTAMP() - 300)");
        $stats['online_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // New Users (last 7 days)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE created_at > (UNIX_TIMESTAMP() - 604800)");
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
        
        // Sorting
        $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at';
        $orderDir = isset($_GET['order_dir']) && strtoupper($_GET['order_dir']) === 'ASC' ? 'ASC' : 'DESC';
        
        $allowedSortCols = ['name', 'created_at', 'last_active', 'email'];
        if (!in_array($sortBy, $allowedSortCols)) {
            $sortBy = 'created_at';
        }

        $query = "SELECT id, name, first_name, family_name, email, is_admin, is_vip, vip_until, coins, xp, status, gender, avatar, created_at, last_active FROM users";
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
        
        $query .= $whereClause . " ORDER BY $sortBy $orderDir LIMIT :limit OFFSET :offset";
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

    public function addCoins() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id) || !isset($data->amount)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID and amount required']);
            return;
        }

        if ($this->user->addCurrency($data->user_id, $data->amount, 'coins')) {
            echo json_encode(['message' => 'Coins updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update coins']);
        }
    }

    public function toggleVip() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        // Get current VIP status
        $stmt = $this->db->prepare("SELECT is_vip FROM users WHERE id = :id");
        $stmt->bindParam(":id", $data->user_id);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $isVip = $user['is_vip'] ? 0 : 1;
        $vipUntil = $isVip ? (time() + (30 * 24 * 60 * 60)) : 0; // Default 30 days if enabling

        $query = "UPDATE users SET is_vip = :is_vip, vip_until = :vip_until WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":is_vip", $isVip);
        $stmt->bindParam(":vip_until", $vipUntil);
        $stmt->bindParam(":id", $data->user_id);

        if ($stmt->execute()) {
            echo json_encode([
                'message' => $isVip ? 'VIP activated' : 'VIP deactivated',
                'is_vip' => $isVip,
                'vip_until' => $vipUntil
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update VIP status']);
        }
    }

    public function updateUser() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->user_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        $allowedFields = ['name', 'email', 'gender', 'bio', 'location'];
        $updates = [];
        $params = [':id' => $data->user_id];

        foreach ($allowedFields as $field) {
            if (isset($data->$field)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data->$field;
            }
        }

        if (empty($updates)) {
             echo json_encode(['message' => 'No changes provided']);
             return;
        }

        $query = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        if($stmt->execute()) {
            echo json_encode(['message' => 'User updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update user']);
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
            (SELECT COUNT(*) FROM messages WHERE sender_id = :uid1) as messages_sent,
            (SELECT COUNT(DISTINCT CASE WHEN sender_id = :uid2 THEN receiver_id ELSE sender_id END) 
             FROM messages 
             WHERE sender_id = :uid3 OR receiver_id = :uid4) as total_conversations
        ";
        $statsStmt = $this->db->prepare($statsQuery);
        $statsStmt->bindValue(":uid1", $userId);
        $statsStmt->bindValue(":uid2", $userId);
        $statsStmt->bindValue(":uid3", $userId);
        $statsStmt->bindValue(":uid4", $userId);
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
                (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id = u.id AND m2.receiver_id = :admin_id1 AND m2.is_read = 0) as unread_count
            FROM users u
            JOIN (
                SELECT 
                    CASE 
                        WHEN sender_id = :admin_id2 THEN receiver_id 
                        ELSE sender_id 
                    END as other_user_id,
                    MAX(created_at) as max_created_at
                FROM messages
                WHERE sender_id = :admin_id3 OR receiver_id = :admin_id4
                GROUP BY other_user_id
            ) latest_msg ON u.id = latest_msg.other_user_id
            JOIN messages m ON (
                (m.sender_id = :admin_id5 AND m.receiver_id = u.id) OR 
                (m.sender_id = u.id AND m.receiver_id = :admin_id6)
            ) AND m.created_at = latest_msg.max_created_at
            ORDER BY m.created_at DESC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':admin_id1', $adminId);
        $stmt->bindValue(':admin_id2', $adminId);
        $stmt->bindValue(':admin_id3', $adminId);
        $stmt->bindValue(':admin_id4', $adminId);
        $stmt->bindValue(':admin_id5', $adminId);
        $stmt->bindValue(':admin_id6', $adminId);
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

        if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
            $maxPostSize = ini_get('post_max_size');
            http_response_code(413); // Payload Too Large
            echo json_encode(['error' => "The uploaded file exceeds the post_max_size directive in php.ini ($maxPostSize)."]);
            return;
        }

        if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
             $errorCode = $_FILES['file']['error'];
             $errorMessage = 'File upload error';
             $maxUploadSize = ini_get('upload_max_filesize');
             
             switch ($errorCode) {
                 case UPLOAD_ERR_INI_SIZE:
                     $errorMessage = "The uploaded file exceeds the upload_max_filesize directive in php.ini ($maxUploadSize).";
                     break;
                 case UPLOAD_ERR_FORM_SIZE:
                     $errorMessage = "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.";
                     break;
                 case UPLOAD_ERR_PARTIAL:
                     $errorMessage = "The uploaded file was only partially uploaded.";
                     break;
                 case UPLOAD_ERR_NO_FILE:
                     $errorMessage = "No file was uploaded.";
                     break;
                 case UPLOAD_ERR_NO_TMP_DIR:
                     $errorMessage = "Missing a temporary folder.";
                     break;
                 case UPLOAD_ERR_CANT_WRITE:
                     $errorMessage = "Failed to write file to disk.";
                     break;
                 case UPLOAD_ERR_EXTENSION:
                     $errorMessage = "A PHP extension stopped the file upload.";
                     break;
             }
             
             http_response_code(400);
             echo json_encode(['error' => $errorMessage]);
             return;
        }

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

    public function getUserActivity() {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            return;
        }

        $userId = $_GET['id'];
        
        // Fetch activity from multiple tables using UNION ALL
        // Ensure all created_at are treated as UNIX timestamps consistently
        $query = "
            SELECT 'account_created' as type, '' as details, created_at as timestamp 
            FROM users WHERE id = :uid1
            UNION ALL
            SELECT 'message_sent' as type, content as details, created_at as timestamp 
            FROM messages WHERE sender_id = :uid2
            UNION ALL
            SELECT 'post_created' as type, text_content as details, created_at as timestamp 
            FROM community_posts WHERE user_id = :uid3
            UNION ALL
            SELECT 'photo_uploaded' as type, caption as details, created_at as timestamp 
            FROM gallery_images WHERE user_id = :uid4
            UNION ALL
            SELECT 'friend_request_sent' as type, '' as details, created_at as timestamp 
            FROM friendships WHERE user_id = :uid5
            ORDER BY timestamp DESC
            LIMIT 50
        ";

        // IMPORTANT: If any table uses TIMESTAMP instead of INT, 
        // we should wrap it in UNIX_TIMESTAMP() to be safe.
        // Based on schema research, most are INT now but some migrations might be partial.
        // Let's use a more defensive query.

        $query = "
            SELECT CAST('account_created' AS CHAR) COLLATE utf8mb4_unicode_ci as type, 
                   CAST('' AS CHAR) COLLATE utf8mb4_unicode_ci as details, 
                   (CASE WHEN created_at REGEXP '^[0-9]+$' THEN created_at ELSE UNIX_TIMESTAMP(created_at) END) as timestamp 
            FROM users WHERE id = :uid1
            UNION ALL
            SELECT CAST('message_sent' AS CHAR) COLLATE utf8mb4_unicode_ci as type, 
                   CAST(COALESCE(content, '') AS CHAR) COLLATE utf8mb4_unicode_ci as details, 
                   (CASE WHEN created_at REGEXP '^[0-9]+$' THEN created_at ELSE UNIX_TIMESTAMP(created_at) END) as timestamp 
            FROM messages WHERE sender_id = :uid2
            UNION ALL
            SELECT CAST('post_created' AS CHAR) COLLATE utf8mb4_unicode_ci as type, 
                   CAST(COALESCE(text_content, '') AS CHAR) COLLATE utf8mb4_unicode_ci as details, 
                   (CASE WHEN created_at REGEXP '^[0-9]+$' THEN created_at ELSE UNIX_TIMESTAMP(created_at) END) as timestamp 
            FROM community_posts WHERE user_id = :uid3
            UNION ALL
            SELECT CAST('photo_uploaded' AS CHAR) COLLATE utf8mb4_unicode_ci as type, 
                   CAST(COALESCE(caption, '') AS CHAR) COLLATE utf8mb4_unicode_ci as details, 
                   (CASE WHEN created_at REGEXP '^[0-9]+$' THEN created_at ELSE UNIX_TIMESTAMP(created_at) END) as timestamp 
            FROM gallery_images WHERE user_id = :uid4
            UNION ALL
            SELECT CAST('friend_request_sent' AS CHAR) COLLATE utf8mb4_unicode_ci as type, 
                   CAST('' AS CHAR) COLLATE utf8mb4_unicode_ci as details, 
                   (CASE WHEN created_at REGEXP '^[0-9]+$' THEN created_at ELSE UNIX_TIMESTAMP(created_at) END) as timestamp 
            FROM friendships WHERE user_id = :uid5
            ORDER BY timestamp DESC
            LIMIT 50
        ";

        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':uid1', $userId);
        $stmt->bindValue(':uid2', $userId);
        $stmt->bindValue(':uid3', $userId);
        $stmt->bindValue(':uid4', $userId);
        $stmt->bindValue(':uid5', $userId);
        $stmt->execute();
        
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Process activities if any special formatting is needed
        // Truncate message contents to prevent huge payloads
        foreach ($activities as &$activity) {
             if (($activity['type'] === 'message_sent' || $activity['type'] === 'post_created' || $activity['type'] === 'photo_uploaded') && strlen($activity['details']) > 100) {
                 $activity['details'] = substr($activity['details'], 0, 100) . '...';
             }
        }

        echo json_encode($activities);
    }

    public function getCommunityPosts() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;

        $query = "SELECT cp.*, u.name as user_name, u.avatar as user_avatar 
                  FROM community_posts cp
                  JOIN users u ON cp.user_id = u.id
                  ORDER BY cp.created_at DESC
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Count total
        $totalStmt = $this->db->query("SELECT COUNT(*) as count FROM community_posts");
        $total = $totalStmt->fetch(PDO::FETCH_ASSOC)['count'];

        echo json_encode([
            'posts' => $posts,
            'total' => $total,
            'page' => $page,
            'pages' => ceil($total / $limit)
        ]);
    }

    public function deleteCommunityPost() {
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->post_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Post ID required']);
            return;
        }

        // Get post to delete media if exists
        $stmt = $this->db->prepare("SELECT media_path FROM community_posts WHERE id = :id");
        $stmt->bindParam(":id", $data->post_id);
        $stmt->execute();
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($post && $post['media_path']) {
            $filepath = __DIR__ . '/../public_html' . $post['media_path'];
            if (file_exists($filepath)) {
                @unlink($filepath);
            }
        }

        $query = "DELETE FROM community_posts WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $data->post_id);
        
        if($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Post deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete post']);
        }
    }
}


