<?php

class TelegramWebhook {
    private $db;
    private $botToken = '8538925698:AAGxnUX0jqbA7-E6H6lZwUoSR8ez7rEYhN0';
    private $apiBaseUrl = 'https://api.telegram.org/bot';

    public function __construct($db) {
        $this->db = $db;
    }

    public function handleUpdate() {
        $update = json_decode(file_get_contents('php://input'), true);

        if (!$update) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            return;
        }

        $this->processUpdate($update);
        http_response_code(200);
        echo json_encode(['status' => 'ok']);
    }

    private function processUpdate($update) {
        if (isset($update['message'])) {
            $this->handleMessage($update['message']);
        }
    }

    private function handleMessage($message) {
        $chatId = $message['chat']['id'];
        $userId = $message['from']['id'];
        $username = $message['from']['username'] ?? '';
        $text = $message['text'] ?? '';

        error_log("Telegram message from user $userId: $text");

        if (strpos($text, '/start') === 0) {
            $this->handleStartCommand($chatId, $userId, $username, $text);
        }
    }

    private function handleStartCommand($chatId, $telegramUserId, $username, $text) {
        $parts = explode(' ', $text);
        $code = $parts[1] ?? '';

        if (empty($code)) {
            $this->sendMessage($chatId, "Welcome to ChatMe!\n\nTo connect your account, please use the link from your ChatMe app profile settings.");
            return;
        }

        $query = "SELECT user_id FROM telegram_pending_codes 
                  WHERE code = :code AND expires_at > NOW()";

        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':code', $code);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            $this->sendMessage($chatId, "Invalid or expired connection code. Please generate a new code in your ChatMe app.");
            return;
        }

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $row['user_id'];

        $updateQuery = "INSERT INTO telegram_connections 
                       (user_id, telegram_user_id, telegram_chat_id, telegram_username, notifications_enabled) 
                       VALUES (:user_id, :tg_user_id, :tg_chat_id, :tg_username, 1)
                       ON DUPLICATE KEY UPDATE 
                       telegram_chat_id = :tg_chat_id,
                       telegram_username = :tg_username,
                       updated_at = NOW()";

        $updateStmt = $this->db->prepare($updateQuery);
        $updateStmt->bindParam(':user_id', $userId);
        $updateStmt->bindParam(':tg_user_id', $telegramUserId);
        $updateStmt->bindParam(':tg_chat_id', $chatId);
        $updateStmt->bindParam(':tg_username', $username);

        if ($updateStmt->execute()) {
            $deleteQuery = "DELETE FROM telegram_pending_codes WHERE code = :code";
            $deleteStmt = $this->db->prepare($deleteQuery);
            $deleteStmt->bindParam(':code', $code);
            $deleteStmt->execute();

            $this->sendMessage($chatId, "✅ Your ChatMe account has been successfully connected!\n\nYou will now receive notifications about new messages, guests, and comments here on Telegram.");
        } else {
            $this->sendMessage($chatId, "Connection failed. Please try again.");
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
                error_log("Telegram API error sending message: $response");
            }
        } catch (Exception $e) {
            error_log("Error sending Telegram message: " . $e->getMessage());
        }
    }

    public function setWebhook($webhookUrl) {
        try {
            $url = $this->apiBaseUrl . $this->botToken . '/setWebhook';

            $postData = [
                'url' => $webhookUrl,
                'allowed_updates' => ['message']
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            curl_close($ch);

            return json_decode($response, true);
        } catch (Exception $e) {
            error_log("Error setting webhook: " . $e->getMessage());
            return false;
        }
    }

    public function getWebhookStatus() {
        try {
            $url = $this->apiBaseUrl . $this->botToken . '/getWebhookInfo';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            curl_close($ch);

            return json_decode($response, true);
        } catch (Exception $e) {
            error_log("Error getting webhook status: " . $e->getMessage());
            return false;
        }
    }
}
