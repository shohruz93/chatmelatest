<?php

class Friendship {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function sendRequest($senderId) {
        $data = json_decode(file_get_contents("php://input"), true);
        $friendId = $data['friendId'];

        if (!$friendId) {
            http_response_code(400);
            echo json_encode(["message" => "Friend ID required"]);
            return;
        }

        // Check if request already exists
        $query = "SELECT * FROM friendships WHERE (user_id = :uid AND friend_id = :fid) OR (user_id = :fid AND friend_id = :uid)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":uid", $senderId);
        $stmt->bindParam(":fid", $friendId);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            echo json_encode(["message" => "Request already sent or users are already friends"]);
            return;
        }

        $query = "INSERT INTO friendships (user_id, friend_id, status) VALUES (:uid, :fid, 'pending')";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":uid", $senderId);
        $stmt->bindParam(":fid", $friendId);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Friend request sent"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to send request"]);
        }
    }

    public function acceptRequest($userId) {
        $data = json_decode(file_get_contents("php://input"), true);
        $requesterId = $data['requesterId'];

        $query = "UPDATE friendships SET status = 'accepted' WHERE user_id = :rid AND friend_id = :uid";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":uid", $userId);
        $stmt->bindParam(":rid", $requesterId);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Friend request accepted"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to accept request"]);
        }
    }

    public function getFriends($userId) {
        $query = "SELECT u.id, u.name, u.avatar 
                  FROM users u
                  JOIN friendships f ON (u.id = f.friend_id AND f.user_id = :uid) OR (u.id = f.user_id AND f.friend_id = :uid)
                  WHERE f.status = 'accepted'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":uid", $userId);
        $stmt->execute();
        $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($friends);
    }
}
