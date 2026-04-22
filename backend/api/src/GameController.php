<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/User.php';
require_once __DIR__ . '/Auth.php';

class GameController {
    private $db;
    private $conn;
    private $user;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
        $this->user = new User($this->conn);
    }

    // POST /games/bet
    public function bet() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->amount) || !isset($data->game)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing amount or game"]);
            return;
        }

        $amount = intval($data->amount);
        $game = $data->game;

        // Check if user has enough coins
        $profile = $this->user->getProfile($userId);
        if ($profile['coins'] < $amount) {
            http_response_code(400);
            echo json_encode(["message" => "Insufficient coins"]);
            return;
        }

        // Deduct coins
        $this->user->addCurrency($userId, -$amount, 'coins');

        // Log transaction (User -> System)
        $this->logTransaction($userId, 0, $amount, 'bet', "Bet on " . $game);

        echo json_encode([
            "message" => "Bet placed",
            "deducted" => $amount,
            "current_coins" => $profile['coins'] - $amount
        ]);
    }

    // POST /games/win
    public function win() {
        // This should ideally be called from a trusted source or via internal API
        // For now, let's assume we trust the request if it has a valid token of the winner
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->amount) || !isset($data->game)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing amount or game"]);
            return;
        }

        $amount = intval($data->amount);
        $game = $data->game ?? 'Game';
        
        // Award coins
        $this->user->addCurrency($userId, $amount, 'coins');
        
        // Award XP for winning
        $this->user->addCurrency($userId, 10, 'xp');

        // Log transaction (System -> User)
        $this->logTransaction(0, $userId, $amount, 'win', "Won in " . $game);

        $profile = $this->user->getProfile($userId);

        echo json_encode([
            "message" => "Winnings awarded",
            "added" => $amount,
            "current_coins" => $profile['coins']
        ]);
    }

    // POST /games/reward-completion
    public function rewardCompletion() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->score)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing score"]);
            return;
        }

        $score = intval($data->score);
        $coins = 0;
        if ($score >= 90) {
            $coins = 1;
            $this->user->addCurrency($userId, $coins, 'coins');
            $this->logTransaction(0, $userId, $coins, 'game_reward', "Reward for high score: " . $score . "%");
        }
        
        $xp = 5;
        $this->user->addCurrency($userId, $xp, 'xp');

        $profile = $this->user->getProfile($userId);

        echo json_encode([
            "message" => "Reward processed",
            "coins_added" => $coins,
            "xp_added" => $xp,
            "current_coins" => $profile['coins']
        ]);
    }

    // POST /games/hint
    public function useHint() {
        $headers = getallheaders();
        $userId = $this->getUserIdFromToken($headers);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $cost = 1;
        $profile = $this->user->getProfile($userId);
        if (!$profile || $profile['coins'] < $cost) {
            http_response_code(400);
            echo json_encode(["message" => "Insufficient coins"]);
            return;
        }

        $this->user->addCurrency($userId, -$cost, 'coins');
        $this->logTransaction($userId, 0, $cost, 'game_hint', "Used hint in game");

        $profile = $this->user->getProfile($userId);
        echo json_encode([
            "success" => true,
            "message" => "Hint purchased",
            "current_coins" => $profile['coins']
        ]);
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

    private function getUserIdFromToken($headers) {
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $apacheHeaders = apache_request_headers();
            $authHeader = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
        }

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            try {
                $decoded = Auth::validateToken($matches[1]);
                return $decoded->id ?? $decoded->sub ?? null;
            } catch (Exception $e) {
                error_log("GameController::getUserIdFromToken - Auth error: " . $e->getMessage());
                return null;
            }
        }

        if (empty($authHeader)) {
            error_log("GameController::getUserIdFromToken - No Authorization header found.");
        }

        return null;
    }
}
