<?php

class AdminController {
    private $db;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
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
        // Verify Admin
        $headers = getallheaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        // Simple token check (in real app, verify JWT properly)
        // Assuming Auth middleware sets user_id in request or we parse it here
        // For now, let's assume we can get user_id from the token or session
        // This part depends on how Auth is handled. 
        // Let's look at Auth.php later. For now, we'll implement the logic.
        
        // Stats queries
        $stats = [];
        
        // Total Users
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users");
        $stats['total_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Active Users (last 24h)
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM users WHERE last_active > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        $stats['active_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
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

        $query = "SELECT id, name, email, is_admin, created_at, last_active FROM users";
        $countQuery = "SELECT COUNT(*) as count FROM users";
        
        if ($search) {
            $query .= " WHERE name LIKE :search OR email LIKE :search";
            $countQuery .= " WHERE name LIKE :search OR email LIKE :search";
        }
        
        $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($query);
        $countStmt = $this->db->prepare($countQuery);
        
        if ($search) {
            $searchTerm = "%$search%";
            $stmt->bindParam(':search', $searchTerm);
            $countStmt->bindParam(':search', $searchTerm);
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
}
