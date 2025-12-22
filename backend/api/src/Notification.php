<?php

require_once __DIR__ . '/Config.php';

class Notification {
    private $db;
    private $fcmServerKey;

    public function __construct($db) {
        $this->db = $db;
        $this->fcmServerKey = Config::get('FCM_SERVER_KEY', '');
    }

    public function send($userId, $title, $body, $data = []) {
        if (empty($this->fcmServerKey)) {
            error_log("FCM_SERVER_KEY is not set. Cannot send push notifications.");
            return;
        }

        $tokens = $this->getTokensForUser($userId);

        if (empty($tokens)) {
            return;
        }

        $url = 'https://fcm.googleapis.com/fcm/send';

        $notification = [
            'title' => $title,
            'body' => $body,
            'sound' => 'default'
        ];
        
        $payload = [
            'notification' => $notification,
            'data' => $data,
            'registration_ids' => $tokens
        ];
        
        $headers = [
            'Authorization: key=' . $this->fcmServerKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

        $result = curl_exec($ch);
        curl_close($ch);

        // Handle FCM response
        $this->handleFcmResponse($result, $tokens);

        // Optional: log the result from FCM
        error_log("FCM result: " . $result);
    }

    private function handleFcmResponse($result, $tokens) {
        $response = json_decode($result, true);

        if (!$response || !isset($response['results'])) {
            return;
        }

        foreach ($response['results'] as $i => $result) {
            if (isset($result['error'])) {
                $error = $result['error'];
                if ($error === 'NotRegistered' || $error === 'InvalidRegistration') {
                    $tokenToDelete = $tokens[$i];
                    $this->deleteToken($tokenToDelete);
                }
            }
        }
    }

    private function getTokensForUser($userId) {
        $query = "SELECT token FROM push_subscriptions WHERE user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    private function deleteToken($token) {
        $query = "DELETE FROM push_subscriptions WHERE token = :token";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();
        error_log("Deleted invalid FCM token: " . $token);
    }
}
