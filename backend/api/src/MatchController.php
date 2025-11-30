<?php

class MatchController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function findMatch($userId) {
        // Simple matching logic: find a user who has at least one common interest
        // and is not the current user.
        // In a real app, this would be more complex and likely involve the socket server for online status.
        // Here we just return a candidate.

        // Get user interests
        $query = "SELECT interest_id FROM user_interests WHERE user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $userInterests = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($userInterests)) {
            // If no interests, find any random user
            $query = "SELECT id, name, avatar FROM users WHERE id != :user_id ORDER BY RAND() LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
        } else {
            // Find user with matching interests
            $placeholders = implode(',', array_fill(0, count($userInterests), '?'));
            $query = "SELECT DISTINCT u.id, u.name, u.avatar 
                      FROM users u
                      JOIN user_interests ui ON u.id = ui.user_id
                      WHERE u.id != ? 
                      AND ui.interest_id IN ($placeholders)
                      ORDER BY RAND() LIMIT 1";
            
            $params = array_merge([$userId], $userInterests);
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
        }

        $match = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($match) {
            echo json_encode(["match" => $match]);
        } else {
            echo json_encode(["message" => "No match found"]);
        }
    }
}
