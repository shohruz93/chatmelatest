<?php

class Push {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function subscribe() {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'];
        $token = $data['token'];
        $platform = $data['platform'];

        if (empty($userId) || empty($token) || empty($platform)) {
            http_response_code(400);
            echo json_encode(["message" => "Missing required fields"]);
            return;
        }

        $query = "INSERT INTO push_subscriptions (user_id, token, platform) 
                  VALUES (:user_id, :token, :platform)
                  ON DUPLICATE KEY UPDATE user_id = :user_id, platform = :platform";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":token", $token);
        $stmt->bindParam(":platform", $platform);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Subscribed successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to subscribe"]);
        }
    }

    public function unsubscribe() {
        $data = json_decode(file_get_contents("php://input"), true);
        $token = $data['token'];

        if (empty($token)) {
            http_response_code(400);
            echo json_encode(["message" => "Token is required"]);
            return;
        }

        $query = "DELETE FROM push_subscriptions WHERE token = :token";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":token", $token);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Unsubscribed successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to unsubscribe"]);
        }
    }
}
