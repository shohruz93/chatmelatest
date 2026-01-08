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
        
        // Award coins
        $this->user->addCurrency($userId, $amount, 'coins');
        
        // Award XP for winning
        $this->user->addCurrency($userId, 10, 'xp');

        $profile = $this->user->getProfile($userId);

        echo json_encode([
            "message" => "Winnings awarded",
            "added" => $amount,
            "current_coins" => $profile['coins']
        ]);
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
