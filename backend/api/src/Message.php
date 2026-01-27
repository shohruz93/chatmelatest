<?php

require_once 'Notification.php';
require_once 'User.php';
require_once 'TimestampHelper.php';
require_once 'Telegram.php';

class Message {
    private $db;
    private $notification;
    private $user;
    private $telegram;

    public function __construct($db) {
        $this->db = $db;
        $this->notification = new Notification($db);
        $this->user = new User($db);
        $this->telegram = new Telegram($db);
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

        TimestampHelper::convertRowsToUnix($messages, ['created_at']);
        echo json_encode($messages);
    }

    public function getByRoom($roomId, $limit = 50, $offset = 0) {
        $query = "SELECT
                    m.*,
                    u.name as senderName,
                    replied.content AS reply_content,
                    reply_sender.name AS reply_sender_name
                  FROM messages m
                  JOIN users u ON u.id = m.sender_id
                  LEFT JOIN messages replied ON m.reply_to_message_id = replied.id
                  LEFT JOIN users reply_sender ON replied.sender_id = reply_sender.id
                  WHERE m.room_id = :room 
                  ORDER BY m.created_at DESC 
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($query);
        $roomId = trim((string)$roomId);
        $stmt->bindParam(":room", $roomId);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($messages as $msg) {
            TimestampHelper::convertRowToUnix($msg, ['created_at']);
            $msg['replyTo'] = null;
            if ($msg['reply_to_message_id']) {
                $msg['replyTo'] = [
                    'content' => $msg['reply_content'],
                    'senderName' => $msg['reply_sender_name']
                ];
            }
            unset($msg['reply_content'], $msg['reply_sender_name']);
            $result[] = $msg;
        }

        echo json_encode($result);
    }

    public function save() {
        try {
            $json = file_get_contents("php://input");
            $data = json_decode($json, true);

            if (!$data) {
                http_response_code(400);
                echo json_encode(["message" => "Invalid JSON data received"]);
                return;
            }

            // --- Validation ---
            $type = $data['type'] ?? 'text';
            $content = $data['content'] ?? '';
            
            // 1. Sanitize content for security (only for text messages)
            if ($type === 'text') {
                $content = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
            }

            // 2. Check for empty message
            if ($type === 'text' && trim($content) === '') {
                http_response_code(400);
                echo json_encode(["message" => "Message content cannot be empty."]);
                return;
            }

            // 3. Check message length
            $maxLength = ($type === 'text') ? 5000 : 10000000;
            $contentLength = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
            
            if ($contentLength > $maxLength) {
                http_response_code(400);
                echo json_encode(["message" => "Message is too long. Maximum $maxLength characters."]);
                return;
            }

            $query = "INSERT INTO messages (sender_id, receiver_id, room_id, content, type, original_lang, reply_to_message_id) 
                      VALUES (:sid, :rid, :room, :content, :type, :lang, :reply_to)";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":sid", $data['senderId']);
            $stmt->bindParam(":rid", $data['receiverId']);
            $stmt->bindParam(":room", $data['roomId']);
            $stmt->bindParam(":content", $content);
            $stmt->bindParam(":type", $type);
            $lang = $data['originalLang'] ?? null;
            $stmt->bindParam(":lang", $lang);
            $replyTo = $data['replyToMessageId'] ?? null;
            $stmt->bindParam(":reply_to", $replyTo);

            if ($stmt->execute()) {
                $lastInsertId = $this->db->lastInsertId();
                
                // Update sender's last active timestamp
                $this->user->updateLastActive($data['senderId']);
                
                // Track gamification progress
                GamificationController::updateProgress($data['senderId'], 'send_message');

                // Track Social Butterfly (unique users today)
                if (!empty($data['receiverId'])) {
                    $checkQuery = "SELECT id FROM messages 
                                   WHERE sender_id = :sid AND receiver_id = :rid 
                                   AND DATE(created_at) = CURDATE() 
                                   AND id != :current_id 
                                   LIMIT 1";
                    $checkStmt = $this->db->prepare($checkQuery);
                    $checkStmt->execute([
                        ':sid' => $data['senderId'],
                        ':rid' => $data['receiverId'],
                        ':current_id' => $lastInsertId
                    ]);
                    
                    if ($checkStmt->rowCount() == 0) {
                        GamificationController::updateProgress($data['senderId'], 'chat_unique_users');
                    }
                }
                
                if (!empty($data['receiverId'])) {
                    // Check if receiver is online
                    $isOnline = $this->user->isOnline($data['receiverId']);

                    if (!$isOnline) {
                        try {
                            $senderName = $this->user->getNameById($data['senderId']);
                            $title = "New message from " . ($senderName ?: 'Someone');
                            $body = ($type === 'text') ? $content : '[' . ucfirst($type) . ']';
                            $payload = [
                                'type' => 'message',
                                'roomId' => $data['roomId'],
                                'senderId' => $data['senderId']
                            ];
                            $this->notification->send($data['receiverId'], $title, $body, $payload);

                            $messagePreview = ($type === 'text') ? substr($content, 0, 100) : '[' . ucfirst($type) . ']';
                            $this->telegram->notifyNewMessage($data['receiverId'], $senderName ?: 'Someone', $messagePreview);
                        } catch (Exception $e) {
                            // Ignore notification errors to not break message saving
                        }
                    }
                }

                // Fetch the created_at timestamp from database
                $fetchQuery = "SELECT created_at FROM messages WHERE id = :id";
                $fetchStmt = $this->db->prepare($fetchQuery);
                $fetchStmt->bindParam(":id", $lastInsertId);
                $fetchStmt->execute();
                $messageRow = $fetchStmt->fetch(PDO::FETCH_ASSOC);
                
                $timestamp = null;
                if ($messageRow && isset($messageRow['created_at'])) {
                    $timestamp = TimestampHelper::toUnix($messageRow['created_at']);
                }

                echo json_encode([
                    "message" => "Message saved", 
                    "id" => $lastInsertId, 
                    "type" => $type,
                    "timestamp" => $timestamp
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to save message"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Server error", "error" => $e->getMessage()]);
        }
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['id']) || !isset($data['content'])) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid data"]);
            return;
        }

        $query = "UPDATE messages SET content = :content WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":content", $data['content']);
        $stmt->bindParam(":id", $data['id']);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Message updated"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update message"]);
        }
    }

    public function delete() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid data"]);
            return;
        }

        $query = "DELETE FROM messages WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $data['id']);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Message deleted"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete message"]);
        }
    }
}
