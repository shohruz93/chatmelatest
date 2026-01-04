<?php

require_once 'TimestampHelper.php';

class Conversation {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getList($userId) {
        // Find all unique users involved in conversations with $userId
        // and get the last message and unread count
        
        $query = "
            SELECT 
                u.id as partner_id, 
                u.name as partner_name, 
                u.avatar as partner_avatar, 
                m.content as last_message, 
                m.created_at as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = :user_id AND is_read = 0) as unread_count
            FROM users u
            JOIN (
                SELECT 
                    CASE 
                        WHEN sender_id = :user_id THEN receiver_id 
                        ELSE sender_id 
                    END as other_user_id,
                    MAX(created_at) as max_created_at
                FROM messages
                WHERE sender_id = :user_id OR receiver_id = :user_id
                GROUP BY other_user_id
            ) last_msg ON u.id = last_msg.other_user_id
            JOIN messages m ON (
                (m.sender_id = :user_id AND m.receiver_id = u.id) OR 
                (m.sender_id = u.id AND m.receiver_id = :user_id)
            ) AND m.created_at = last_msg.max_created_at
            ORDER BY last_message_time DESC
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            TimestampHelper::convertRowsToUnix($conversations, ['last_message_time']);
            echo json_encode($conversations);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
    
    public function markAsRead($userId, $otherUserId) {
        $query = "UPDATE messages SET is_read = 1 WHERE sender_id = :other_id AND receiver_id = :user_id";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->bindParam(":other_id", $otherUserId);
            $stmt->execute();
            echo json_encode(["message" => "Messages marked as read"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
