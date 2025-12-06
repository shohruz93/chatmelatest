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

        $query = "SELECT id, name, email, is_admin, status, gender, country, created_at, last_active FROM users";
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
}
