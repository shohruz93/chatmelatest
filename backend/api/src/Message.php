<?php

require_once 'Notification.php';
require_once 'User.php';

class Message {
    private $db;
    private $notification;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->notification = new Notification($db);
        $this->user = new User($db);
    }

    public function getHistory($userId, $otherUserId) {
        $query = "SELECT * FROM messages 
                  WHERE (sender_id = :uid AND receiver_id = :oid) 
                     OR (sender_id = :oid AND receiver_id = :uid)
                  ORDER BY created_at ASC";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":uid", $userId);
        $stmt->bindParam(":oid", $otherUserId);
        $stmt->execute();
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($messages);
    }

    public function getByRoom($roomId, $limit = 50, $offset = 0) {
        $query = "SELECT * FROM messages 
                  WHERE room_id = :room 
                  ORDER BY created_at DESC 
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":room", $roomId);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($messages);
    }

    public function save() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $query = "INSERT INTO messages (sender_id, receiver_id, room_id, content, original_lang) 
                  VALUES (:sid, :rid, :room, :content, :lang)";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":sid", $data['senderId']);
        // receiverId may be null
        $stmt->bindParam(":rid", $data['receiverId']);
        $stmt->bindParam(":room", $data['roomId']);
        $stmt->bindParam(":content", $data['content']);
        $stmt->bindParam(":lang", $data['originalLang']);

        if ($stmt->execute()) {
            $lastInsertId = $this->db->lastInsertId();
            
            // Send push notification
            if (!empty($data['receiverId'])) {
                $senderName = $this->user->getNameById($data['senderId']);
                $title = "New message from " . ($senderName ?: 'Someone');
                $body = $data['content'];
                $payload = [
                    'type' => 'message',
                    'roomId' => $data['roomId'],
                    'senderId' => $data['senderId']
                ];
                $this->notification->send($data['receiverId'], $title, $body, $payload);
            }

            echo json_encode(["message" => "Message saved", "id" => $lastInsertId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to save message"]);
        }
    }
}
