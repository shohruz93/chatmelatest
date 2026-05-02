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
     * POST /coins/verify-purchase
     * Body: { purchaseToken, productId }
     * Called by Android after a successful Google Play purchase.
     * Verifies the purchase token with Google Play API and awards coins.
     */
    public function verifyPlayPurchase() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $purchaseToken = $data['purchaseToken'] ?? null;
        $productId     = $data['productId'] ?? null;

        if (!$purchaseToken || !$productId) {
            http_response_code(400);
            echo json_encode(["error" => "Missing purchaseToken or productId"]);
            return;
        }

        // Map productId -> coins amount
        $coinsMap = [
            'coins_100'  => 100,
            'coins_1000' => 1000,
        ];

        // VIP subscription product IDs
        $vipProducts = ['vip_1_month', 'vip_6_month'];

        // Check if already processed (prevent duplicate rewards)
        $checkQuery = "SELECT id FROM purchase_tokens WHERE token = :token";
        $checkStmt = $this->conn->prepare($checkQuery);
        $checkStmt->execute([':token' => $purchaseToken]);
        if ($checkStmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(["error" => "Purchase already processed"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Record this purchase token to prevent duplicate processing
            $insertToken = "INSERT INTO purchase_tokens (user_id, token, product_id, created_at) VALUES (:uid, :token, :product, NOW())";
            $insertStmt = $this->conn->prepare($insertToken);
            $insertStmt->execute([':uid' => $userId, ':token' => $purchaseToken, ':product' => $productId]);

            if (in_array($productId, $vipProducts)) {
                // Award VIP status
                $months = ($productId === 'vip_6_month') ? 6 : 1;
                $duration = $months * 30 * 24 * 60 * 60;
                $profile = $this->user->getProfile($userId);
                $newVipUntil = max(time(), (int)($profile['vip_until'] ?? 0)) + $duration;

                $vipQuery = "UPDATE users SET is_vip = 1, vip_until = :until WHERE id = :id";
                $vipStmt = $this->conn->prepare($vipQuery);
                $vipStmt->execute([':until' => $newVipUntil, ':id' => $userId]);

                $this->logTransaction($userId, 0, 0, 'vip_purchase', "Google Play VIP $months months");

                $this->conn->commit();
                echo json_encode([
                    "success" => true,
                    "type" => "vip",
                    "vip_until" => $newVipUntil,
                    "message" => "VIP activated for $months month(s)"
                ]);

            } elseif (isset($coinsMap[$productId])) {
                // Award coins
                $coinsAmount = $coinsMap[$productId];
                $this->user->addCurrency($userId, $coinsAmount, 'coins');
                $this->logTransaction(0, $userId, $coinsAmount, 'purchase', "Google Play: $productId");

                $this->conn->commit();
                $updatedProfile = $this->user->getProfile($userId);
                echo json_encode([
                    "success" => true,
                    "type" => "coins",
                    "coins_added" => $coinsAmount,
                    "current_coins" => (int)$updatedProfile['coins'],
                    "message" => "$coinsAmount coins added to your balance"
                ]);
            } else {
                $this->conn->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "Unknown product: $productId"]);
            }

        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Verification failed: " . $e->getMessage()]);
        }
    }

    /**
     * Log a coin transaction
     * History logging is disabled - no longer needed
     */
    private function logTransaction($senderId, $receiverId, $amount, $type = 'transfer', $note = null) {
        try {
            $query = "INSERT INTO coin_transactions (sender_id, receiver_id, amount, type, note, created_at) 
                      VALUES (:sid, :rid, :amount, :type, :note, NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':sid' => $senderId,
                ':rid' => $receiverId,
                ':amount' => $amount,
                ':type' => $type,
                ':note' => $note
            ]);
            return true;
        } catch (Exception $e) {
            error_log("Failed to log transaction: " . $e->getMessage());
            return false;
        }
    }

    /**
     * GET /webhook/monetag
     * Monetag S2S Postback Webhook
     * URL format: /webhook/monetag?user_id={var}
     */
    public function monetagWebhook() {
        $userId = $_GET['user_id'] ?? null;
        
        if (!$userId) {
            http_response_code(400);
            echo "Missing user_id";
            return;
        }

        // Check cooldown from users table (using last_ad_reward column)
        $query = "SELECT last_ad_reward FROM users WHERE id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $user['last_ad_reward']) {
            $lastTime = strtotime($user['last_ad_reward']);
            $now = time();
            if (($now - $lastTime) < 300) {
                // Cooldown active (5 mins)
                http_response_code(429);
                echo "Cooldown active";
                return;
            }
        }

        $rewardAmount = 1; 

        // Update coins and last_ad_reward timestamp
        $updateQuery = "UPDATE users SET coins = coins + :amount, last_ad_reward = NOW() WHERE id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        
        if ($updateStmt->execute([':amount' => $rewardAmount, ':user_id' => $userId])) {
            echo "OK";
        } else {
            http_response_code(500);
            echo "Failed";
        }
    }

    /**
     * POST /coins/reward-ad
     * Simple reward endpoint for Android (checks 5 min cooldown)
     */
    public function rewardAd() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        // Check cooldown from users table
        $query = "SELECT last_ad_reward FROM users WHERE id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $user['last_ad_reward']) {
            $lastTime = strtotime($user['last_ad_reward']);
            $now = time();
            $diff = $now - $lastTime;
            if ($diff < 300) {
                http_response_code(429);
                echo json_encode([
                    "error" => "Cooldown active",
                    "remaining" => 300 - $diff
                ]);
                return;
            }
        }

        $rewardAmount = 1; 

        // Update coins and last_ad_reward timestamp
        $updateQuery = "UPDATE users SET coins = coins + :amount, last_ad_reward = NOW() WHERE id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        
        if ($updateStmt->execute([':amount' => $rewardAmount, ':user_id' => $userId])) {
            $profile = $this->user->getProfile($userId);
            echo json_encode([
                "success" => true,
                "message" => "Reward claimed!",
                "amount" => $rewardAmount,
                "current_coins" => (int)$profile['coins']
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to claim reward"]);
        }
    }

    /**
     * POST /coins/start-ad
     * Generate an ad token to securely verify 30-second view time
     */
    public function startAd() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }
        
        $payload = json_encode(['id' => $userId, 'start' => time()]);
        $signature = hash_hmac('sha256', $payload, 'ChatMeSecureAdSecret123!');
        $adToken = base64_encode($payload . '::' . $signature);
        
        echo json_encode(["adToken" => $adToken]);
    }

    /**
     * POST /coins/claim-reward
     * Manually claim 3 coins after viewing ad for 30s (30 min cooldown)
     */
    public function claimReward() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $adToken = $data['adToken'] ?? null;
        if (!$adToken) {
            http_response_code(400);
            echo json_encode(["error" => "Missing ad token"]);
            return;
        }
        
        $decoded = base64_decode($adToken);
        $parts = explode('::', $decoded);
        if (count($parts) !== 2) {
            http_response_code(400); echo json_encode(["error" => "Invalid ad token format"]); return;
        }
        
        $payload = $parts[0];
        $signature = $parts[1];
        $expectedSignature = hash_hmac('sha256', $payload, 'ChatMeSecureAdSecret123!');
        
        if (!hash_equals($expectedSignature, $signature)) {
            http_response_code(400); echo json_encode(["error" => "Token signature mismatch"]); return;
        }
        
        $tokenData = json_decode($payload, true);
        if ($tokenData['id'] != $userId) {
            http_response_code(400); echo json_encode(["error" => "Token user mismatch"]); return;
        }
        
        $elapsed = time() - $tokenData['start'];
        if ($elapsed < 28) { // give 2 seconds buffer for network latency
            http_response_code(400); 
            echo json_encode(["error" => "Ad watched for too little time. Needs 30 seconds."]); 
            return;
        }
        if ($elapsed > 300) { // 5 mins expiry
            http_response_code(400); 
            echo json_encode(["error" => "Ad token expired"]); 
            return;
        }

        // Check cooldown from users table (using last_ad_reward column)
        $query = "SELECT last_ad_reward FROM users WHERE id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $user['last_ad_reward']) {
            $lastTime = strtotime($user['last_ad_reward']);
            $now = time();
            $diff = $now - $lastTime;
            if ($diff < 300) {
                http_response_code(429);
                echo json_encode([
                    "error" => "Cooldown active",
                    "remaining" => 300 - $diff
                ]);
                return;
            }
        }

        $rewardAmount = 1; 

        // Update coins and last_ad_reward timestamp
        $updateQuery = "UPDATE users SET coins = coins + :amount, last_ad_reward = NOW() WHERE id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        
        if ($updateStmt->execute([':amount' => $rewardAmount, ':user_id' => $userId])) {
            echo json_encode([
                "success" => true,
                "message" => "Reward claimed!",
                "amount" => $rewardAmount
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to claim reward"]);
        }
    }
    public function buyVip() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $months = (int)($data['months'] ?? 1);
        $cost = ($months >= 6) ? 250 : 50; // New prices: 50 for 1 month, 250 for 6 months

        $profile = $this->user->getProfile($userId);
        if (!$profile || $profile['coins'] < $cost) {
            http_response_code(400);
            echo json_encode(["error" => "Insufficient coins"]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Deduct coins
            $this->user->addCurrency($userId, -$cost, 'coins');

            // Set VIP status
            $duration = $months * 30 * 24 * 60 * 60; // seconds
            $newVipUntil = max(time(), (int)($profile['vip_until'] ?? 0)) + $duration;

            $query = "UPDATE users SET is_vip = 1, vip_until = :until WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':until' => $newVipUntil, ':id' => $userId]);

            // Log VIP purchase
            $this->logTransaction($userId, 0, $cost, 'vip_purchase', "VIP for $months months");

            $this->conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "VIP activated until " . date('Y-m-d H:i:s', $newVipUntil),
                "vip_until" => $newVipUntil,
                "current_coins" => (int)($profile['coins'] - $cost)
            ]);

        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Failed to purchase VIP"]);
        }
    }

    /**
     * POST /coins/vip-settings
     * Toggle hide_from_connect
     */
    public function updateVipSettings() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $hide = (int)($data['hide_from_connect'] ?? 0);

        $profile = $this->user->getProfile($userId);
        if (!$profile || !$profile['is_vip']) {
            http_response_code(403);
            echo json_encode(["error" => "Only VIP users can change this setting"]);
            return;
        }

        $query = "UPDATE users SET hide_from_connect = :hide WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        if ($stmt->execute([':hide' => $hide, ':id' => $userId])) {
            echo json_encode(["success" => true, "hide_from_connect" => $hide]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update settings"]);
        }
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
