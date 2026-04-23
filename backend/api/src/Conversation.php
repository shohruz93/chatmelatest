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
                u.last_active as partner_last_active,
                u.is_vip as partner_is_vip,
                m.content as last_message, 
                m.created_at as last_message_time,
                m.sender_id as last_message_sender_id,
                m.is_read as last_message_is_read,
                (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = :u1 AND is_read = 0) as unread_count
            FROM users u
            JOIN (
                SELECT 
                    CASE 
                        WHEN sender_id = :u2 THEN receiver_id 
                        ELSE sender_id 
                    END as other_user_id,
                    MAX(created_at) as max_created_at
                FROM messages
                WHERE sender_id = :u3 OR receiver_id = :u4
                GROUP BY other_user_id
            ) last_msg ON u.id = last_msg.other_user_id
            JOIN messages m ON (
                (m.sender_id = :u5 AND m.receiver_id = u.id) OR 
                (m.sender_id = u.id AND m.receiver_id = :u6)
            ) AND m.created_at = last_msg.max_created_at
            ORDER BY last_message_time DESC
        ";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->bindValue(":u1", $userId);
            $stmt->bindValue(":u2", $userId);
            $stmt->bindValue(":u3", $userId);
            $stmt->bindValue(":u4", $userId);
            $stmt->bindValue(":u5", $userId);
            $stmt->bindValue(":u6", $userId);
            $stmt->execute();
            $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            TimestampHelper::convertRowsToUnix($conversations, ['last_message_time', 'partner_last_active']);
            echo json_encode($conversations);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    public function delete($userId, $partnerId) {
        $query = "DELETE FROM messages 
                  WHERE (sender_id = :u1 AND receiver_id = :p1) 
                     OR (sender_id = :p2 AND receiver_id = :u2)";
        try {
            // First find all media files associated with this conversation
            $fileQuery = "SELECT content FROM messages 
                          WHERE ((sender_id = :u1 AND receiver_id = :p1) 
                             OR (sender_id = :p2 AND receiver_id = :u2))
                            AND type IN ('image', 'audio', 'voice')";
                            
            $fileStmt = $this->db->prepare($fileQuery);
            $fileStmt->bindParam(":u1", $userId);
            $fileStmt->bindParam(":p1", $partnerId);
            $fileStmt->bindParam(":p2", $partnerId);
            $fileStmt->bindParam(":u2", $userId);
            $fileStmt->execute();
            
            while ($row = $fileStmt->fetch(PDO::FETCH_ASSOC)) {
                $content = $row['content'];
                if (strpos($content, '/uploads/chat/') === 0) {
                    $physicalPath = __DIR__ . '/../public_html' . $content;
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath);
                    }
                }
            }

            // Now delete the records
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":u1", $userId);
            $stmt->bindParam(":p1", $partnerId);
            $stmt->bindParam(":p2", $partnerId);
            $stmt->bindParam(":u2", $userId);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Conversation deleted"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Failed to delete conversation"]);
            }
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
