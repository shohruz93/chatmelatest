<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/User.php';

class CoinsController {
    private $conn;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        $this->user = new User($this->conn);
    }

    /**
     * GET /coins/balance
     * Returns the current user's coin balance
     */
    public function getBalance() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $profile = $this->user->getProfile($userId);
        
        if ($profile) {
            echo json_encode([
                "coins" => (int)($profile['coins'] ?? 0),
                "xp" => (int)($profile['xp'] ?? 0)
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "User not found"]);
        }
    }

    /**
     * GET /coins/transactions
     * Query params: type (all|incoming|outgoing), limit, offset
     */
    public function getTransactions() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $type = $_GET['type'] ?? 'all';
        $limit = (int)($_GET['limit'] ?? 20);
        $offset = (int)($_GET['offset'] ?? 0);

        $whereClause = "";
        $params = [];

        if ($type === 'incoming') {
            $whereClause = "WHERE ct.receiver_id = :userId";
            $params[':userId'] = $userId;
        } elseif ($type === 'outgoing') {
            $whereClause = "WHERE ct.sender_id = :userId";
            $params[':userId'] = $userId;
        } else {
            $whereClause = "WHERE ct.sender_id = :userId1 OR ct.receiver_id = :userId2";
            $params[':userId1'] = $userId;
            $params[':userId2'] = $userId;
        }

        $query = "
            SELECT 
                ct.id,
                ct.sender_id,
                ct.receiver_id,
                ct.amount,
                ct.type,
                ct.note,
                ct.created_at,
                sender.name as sender_name,
                sender.avatar as sender_avatar,
                receiver.name as receiver_name,
                receiver.avatar as receiver_avatar
            FROM coin_transactions ct
            LEFT JOIN users sender ON ct.sender_id = sender.id
            LEFT JOIN users receiver ON ct.receiver_id = receiver.id
            $whereClause
            ORDER BY ct.created_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mark each transaction as incoming or outgoing for the current user
        foreach ($transactions as &$t) {
            $t['direction'] = ($t['receiver_id'] == $userId) ? 'incoming' : 'outgoing';
            $t['amount'] = (int)$t['amount'];
        }

        echo json_encode($transactions);
    }

    /**
     * POST /coins/send
     * Body: { receiverId, amount, note? }
     */
    public function sendCoins() {
        $headers = getallheaders();
        $senderId = $this->getUserIdFromToken($headers);
        
        if (!$senderId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $receiverId = $data['receiverId'] ?? 0;
        $amount = (int)($data['amount'] ?? 0);
        $note = $data['note'] ?? null;

        // Validation
        if (!$receiverId || $amount <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid receiver or amount"]);
            return;
        }

        if ($senderId == $receiverId) {
            http_response_code(400);
            echo json_encode(["error" => "Cannot send coins to yourself"]);
            return;
        }

        // Check sender balance
        $senderProfile = $this->user->getProfile($senderId);
        if (!$senderProfile || $senderProfile['coins'] < $amount) {
            http_response_code(400);
            echo json_encode(["error" => "Insufficient coins"]);
            return;
        }

        // Check receiver exists
        $receiverProfile = $this->user->getProfile($receiverId);
        if (!$receiverProfile) {
            http_response_code(404);
            echo json_encode(["error" => "Receiver not found"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Deduct from sender
            $this->user->addCurrency($senderId, -$amount, 'coins');

            // Add to receiver
            $this->user->addCurrency($receiverId, $amount, 'coins');

            // Log transaction
            $this->logTransaction($senderId, $receiverId, $amount, 'transfer', $note);

            $this->conn->commit();

            // Get updated balance
            $updatedProfile = $this->user->getProfile($senderId);

            echo json_encode([
                "success" => true,
                "message" => "Coins sent successfully",
                "current_coins" => (int)$updatedProfile['coins'],
                "sent_amount" => $amount,
                "receiver_name" => $receiverProfile['name']
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
    }

    /**
     * Log a coin transaction
     */
    private function logTransaction($senderId, $receiverId, $amount, $type = 'transfer', $note = null) {
        $query = "INSERT INTO coin_transactions (sender_id, receiver_id, amount, type, note) 
                  VALUES (:sender_id, :receiver_id, :amount, :type, :note)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':sender_id', $senderId);
        $stmt->bindParam(':receiver_id', $receiverId);
        $stmt->bindParam(':amount', $amount);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':note', $note);
        return $stmt->execute();
    }

    /**
     * Extract User ID from Bearer Token
     */
    private function getUserIdFromToken($headers) {
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $apacheHeaders = apache_request_headers();
            $authHeader = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
        }

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            try {
                require_once __DIR__ . '/Auth.php';
                $decoded = Auth::validateToken($matches[1]);
                return $decoded->id ?? $decoded->sub ?? null;
            } catch (Exception $e) {
                error_log("CoinsController::getUserIdFromToken - Auth error: " . $e->getMessage());
                return null;
            }
        }
        
        if (empty($authHeader)) {
            error_log("CoinsController::getUserIdFromToken - No Authorization header found.");
        }
        
        return null;
    }
}
