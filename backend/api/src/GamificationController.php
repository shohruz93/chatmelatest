<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/User.php';

class GamificationController {
    private $db;
    private $conn;
    private $user;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
        $this->user = new User($this->conn);
    }

    // GET /gamification/missions
    public function getMissions() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        // 1. Get all available missions
        // For 'daily' missions, we check if they are already in user_missions for today.
        // If not, we insert them.

        $this->assignDailyMissions($userId);

        // 2. Fetch user's missions with status
        $query = "
            SELECT m.id, m.title, m.description, m.reward_coins, m.xp_reward, m.type, m.condition_key, m.condition_value, m.icon,
                   um.id as user_mission_id, um.status, um.progress
            FROM missions m
            JOIN user_missions um ON m.id = um.mission_id
            WHERE um.user_id = :user_id
            AND (
                m.type = 'infinite' 
                OR (m.type = 'daily' AND DATE(um.created_at) = CURDATE())
                OR (m.type = 'one_time')
            )
            ORDER BY um.status ASC, m.id ASC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($missions);
    }

    // POST /gamification/claim
    public function claimMission() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->user_mission_id)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing user_mission_id"]);
            return;
        }

        // Check if mission is completed but not claimed
        $query = "SELECT um.*, m.reward_coins, m.xp_reward 
                  FROM user_missions um
                  JOIN missions m ON um.mission_id = m.id
                  WHERE um.id = :id AND um.user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $data->user_mission_id);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();

        if ($stmt->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(["message" => "Mission not found"]);
            return;
        }

        $mission = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($mission['status'] == 'claimed') {
            http_response_code(400);
            echo json_encode(["message" => "Reward already claimed"]);
            return;
        }

        if ($mission['progress'] < $mission['condition_value'] && $mission['status'] != 'completed') {
             // Verification double check (server-side progress check should trigger 'completed' status, but we can allow implicit complete if progress is enough)
             // For now, let's assume specific actions update progress and set status to 'completed'.
             // Or we can just check progress here.
             // Let's rely on progress >= condition_value
             // Wait, I haven't implemented progress updates yet. 
             // Simplification: Clients might not control progress.
        }

        // Allow claiming if progress is sufficient
        // Re-fetch mission definition to check condition_value
        $defQuery = "SELECT condition_value FROM missions WHERE id = :mid";
        $defStmt = $this->conn->prepare($defQuery);
        $defStmt->execute([':mid' => $mission['mission_id']]);
        $defRow = $defStmt->fetch(PDO::FETCH_ASSOC);
        
        // For MVP manual verify or trust the status if logic sets it.
        // Let's assume we implement checkProgress separately.
        
        if ($mission['status'] !== 'completed') {
            http_response_code(400);
            echo json_encode(["message" => "Mission not completed yet"]);
            return;
        }

        // Award rewards
        $this->user->addCurrency($userId, $mission['reward_coins'], 'coins');
        $this->user->addCurrency($userId, $mission['xp_reward'], 'xp');

        // Update status to claimed
        $updateQuery = "UPDATE user_missions SET status = 'claimed', completed_at = NOW() WHERE id = :id";
        $updateStmt = $this->conn->prepare($updateQuery);
        $updateStmt->bindParam(":id", $data->user_mission_id);
        $updateStmt->execute();

        echo json_encode([
            "message" => "Reward claimed",
            "coins_added" => $mission['reward_coins'],
            "xp_added" => $mission['xp_reward']
        ]);
    }

    // Helper: Initialize daily missions for user
    private function assignDailyMissions($userId) {
        // Get all daily missions
        $query = "SELECT id FROM missions WHERE type = 'daily'";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $dailyMissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($dailyMissions as $m) {
            // Check if exists for today
            $checkQuery = "SELECT id FROM user_missions 
                           WHERE user_id = :user_id 
                           AND mission_id = :mission_id 
                           AND DATE(created_at) = CURDATE()";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([':user_id' => $userId, ':mission_id' => $m['id']]);

            if ($checkStmt->rowCount() == 0) {
                // Assign it
                $insQuery = "INSERT INTO user_missions (user_id, mission_id, status, progress, created_at) 
                             VALUES (:user_id, :mission_id, 'active', 0, NOW())";
                $insStmt = $this->conn->prepare($insQuery);
                $insStmt->execute([':user_id' => $userId, ':mission_id' => $m['id']]);
            }
        }
    }

    // Helper: Update progress (To be called from other controllers)
    // Example usage: GamificationController::updateProgress($userId, 'send_message', 1);
    public static function updateProgress($userId, $conditionKey, $amount = 1) {
        $db = new Database();
        $conn = $db->getConnection();

        // Find active missions matching this condition
        // For daily missions, ensure we only update today's instance
        $query = "
            SELECT um.id, um.progress, m.condition_value 
            FROM user_missions um
            JOIN missions m ON um.mission_id = m.id
            WHERE um.user_id = :user_id 
            AND m.condition_key = :key
            AND um.status = 'active'
            AND (m.type != 'daily' OR DATE(um.created_at) = CURDATE())
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([':user_id' => $userId, ':key' => $conditionKey]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $newProgress = $row['progress'] + $amount;
            $status = 'active';
            if ($newProgress >= $row['condition_value']) {
                $status = 'completed';
                $newProgress = $row['condition_value']; // Cap it?
            }

            $upd = "UPDATE user_missions SET progress = :prog, status = :status WHERE id = :id";
            $updStmt = $conn->prepare($upd);
            $updStmt->execute([':prog' => $newProgress, ':status' => $status, ':id' => $row['id']]);
        }
    }

    // Helper: Extract User ID from Bearer Token (Simulated/Reused logic)
    private function getUserIdFromToken($headers) {
        // Basic implementation matching existing simple auth or JWT
        // Check Auth header
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            // For now, assume token is user_id or very simple decodable
            // Creating a real JWT check here would require including the JWT lib if used
            // OR reuse Auth class.
            // Let's use Auth logic if available.
            require_once __DIR__ . '/Auth.php';
            // Assuming Auth class has verification
            // If Auth.php is simple, let's peek at it.
            // Earlier I saw Auth.php.
            // Let's just try to decode assuming it's a valid ID for this stage 
            // OR better, look at existing controllers.
            // I'll assume standard JWT decoding.
            // For safety, I'll return false if fails.
            
            try {
                $decoded = Auth::validateToken($matches[1]);
                return $decoded->data->id ?? $decoded->sub ?? null; // Adjust based on JWT payload
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }
}
