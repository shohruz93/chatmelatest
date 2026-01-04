<?php

require_once 'User.php';

class Telegram {
    private $db;
    private $botToken = '8538925698:AAGxnUX0jqbA7-E6H6lZwUoSR8ez7rEYhN0';
    private $apiBaseUrl = 'https://api.telegram.org/bot';

    public function __construct($db) {
        $this->db = $db;
    }

    public function generateConnectionCode() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $userId = $data['userId'] ?? 0;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required']);
                return;
            }

            $code = bin2hex(random_bytes(16));
            $expiresAt = time() + 600;

            $query = "INSERT INTO telegram_pending_codes (user_id, code, expires_at) 
                      VALUES (:user_id, :code, FROM_UNIXTIME(:expires_at))
                      ON DUPLICATE KEY UPDATE code = :code, expires_at = FROM_UNIXTIME(:expires_at)";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':code', $code);
            $stmt->bindParam(':expires_at', $expiresAt);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'code' => $code,
                    'botUsername' => 'ChatMeBot',
                    'deepLink' => "https://t.me/ChatMeBot?start=$code"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to generate connection code']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function verifyAndConnect() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $userId = $data['userId'] ?? 0;
            $telegramUserId = $data['telegramUserId'] ?? 0;
            $telegramChatId = $data['telegramChatId'] ?? 0;
            $telegramUsername = $data['telegramUsername'] ?? null;
            $code = $data['code'] ?? '';

            if (!$userId || !$telegramUserId || !$telegramChatId || !$code) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                return;
            }

            $query = "SELECT user_id FROM telegram_pending_codes 
                      WHERE user_id = :user_id AND code = :code 
                      AND expires_at > NOW()";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':code', $code);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid or expired code']);
                return;
            }

            $insertQuery = "INSERT INTO telegram_connections 
                           (user_id, telegram_user_id, telegram_chat_id, telegram_username, notifications_enabled) 
                           VALUES (:user_id, :tg_user_id, :tg_chat_id, :tg_username, 1)
                           ON DUPLICATE KEY UPDATE 
                           telegram_chat_id = :tg_chat_id,
                           telegram_username = :tg_username,
                           updated_at = NOW()";

            $insertStmt = $this->db->prepare($insertQuery);
            $insertStmt->bindParam(':user_id', $userId);
            $insertStmt->bindParam(':tg_user_id', $telegramUserId);
            $insertStmt->bindParam(':tg_chat_id', $telegramChatId);
            $insertStmt->bindParam(':tg_username', $telegramUsername);

            if ($insertStmt->execute()) {
                $deleteQuery = "DELETE FROM telegram_pending_codes WHERE user_id = :user_id";
                $deleteStmt = $this->db->prepare($deleteQuery);
                $deleteStmt->bindParam(':user_id', $userId);
                $deleteStmt->execute();

                echo json_encode(['success' => true, 'message' => 'Telegram connected successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to connect Telegram']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function getStatus() {
        try {
            $userId = $_GET['userId'] ?? 0;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required']);
                return;
            }

            $query = "SELECT telegram_username, notifications_enabled, connected_at 
                      FROM telegram_connections WHERE user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode([
                    'connected' => true,
                    'telegramUsername' => $connection['telegram_username'],
                    'notificationsEnabled' => (bool)$connection['notifications_enabled'],
                    'connectedAt' => $connection['connected_at']
                ]);
            } else {
                echo json_encode(['connected' => false]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function disconnect() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $userId = $data['userId'] ?? 0;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required']);
                return;
            }

            $query = "DELETE FROM telegram_connections WHERE user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Telegram disconnected successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to disconnect Telegram']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function toggleNotifications() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $userId = $data['userId'] ?? 0;
            $enabled = $data['enabled'] ?? false;

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required']);
                return;
            }

            $query = "UPDATE telegram_connections SET notifications_enabled = :enabled 
                      WHERE user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':enabled', $enabled, PDO::PARAM_BOOL);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'notificationsEnabled' => $enabled]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update notification settings']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    public function sendMessage($chatId, $message) {
        try {
            $url = $this->apiBaseUrl . $this->botToken . '/sendMessage';

            $postData = [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML'
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                error_log("Telegram API error: $response");
                return false;
            }

            return true;
        } catch (Exception $e) {
            error_log("Error sending Telegram message: " . $e->getMessage());
            return false;
        }
    }

    public function notifyNewMessage($userId, $senderName, $messagePreview) {
        try {
            $query = "SELECT telegram_chat_id, notifications_enabled FROM telegram_connections 
                      WHERE user_id = :user_id AND notifications_enabled = 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);
                $chatId = $connection['telegram_chat_id'];

                $message = "<b>New message from $senderName</b>\n\n$messagePreview";
                $this->sendMessage($chatId, $message);
            }
        } catch (Exception $e) {
            error_log("Error notifying new message: " . $e->getMessage());
        }
    }

    public function notifyNewGuest($userId, $guestName) {
        try {
            $query = "SELECT telegram_chat_id, notifications_enabled FROM telegram_connections 
                      WHERE user_id = :user_id AND notifications_enabled = 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);
                $chatId = $connection['telegram_chat_id'];

                $message = "<b>New guest visit!</b>\n\n$guestName viewed your profile.";
                $this->sendMessage($chatId, $message);
            }
        } catch (Exception $e) {
            error_log("Error notifying new guest: " . $e->getMessage());
        }
    }

    public function notifyNewComment($userId, $commenterName, $commentPreview) {
        try {
            $query = "SELECT telegram_chat_id, notifications_enabled FROM telegram_connections 
                      WHERE user_id = :user_id AND notifications_enabled = 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);
                $chatId = $connection['telegram_chat_id'];

                $message = "<b>New comment from $commenterName</b>\n\n$commentPreview";
                $this->sendMessage($chatId, $message);
            }
        } catch (Exception $e) {
            error_log("Error notifying new comment: " . $e->getMessage());
        }
    }
}
