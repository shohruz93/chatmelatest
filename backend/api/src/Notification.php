<?php

require_once __DIR__ . '/Config.php';

class Notification {
    private $db;
    private $serviceAccountPath;

    public function __construct($db) {
        $this->db = $db;
        $this->serviceAccountPath = __DIR__ . '/../chatme-f1d8a-firebase-adminsdk-fbsvc-60b105834e.json';
    }

    private function logFcm($message) {
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($this->logFilePath, "[$timestamp] " . $message . PHP_EOL, FILE_APPEND);
    }

    public function send($userId, $title, $body, $data = []) {
       
        $tokens = $this->getTokensForUser($userId);

        if (empty($tokens)) {
            return;
        }

        $accessToken = $this->getAccessToken();
        if (!$accessToken) {
            return;
        }

        $serviceAccount = json_decode(file_get_contents($this->serviceAccountPath), true);
        $projectId = $serviceAccount['project_id'];
        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ];

        foreach ($tokens as $token) {

            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body
                    ],
                    'data' => array_map('strval', $data)
                ]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                $this->logFcm("cURL Error for token $token: " . $curlError);
            }

            if ($httpCode === 404 || $httpCode === 410) {
                $this->logFcm("Token $token is invalid. Deleting from database.");
                $this->deleteToken($token);
            }
        }
    }

    private function getAccessToken() {
        if (!file_exists($this->serviceAccountPath)) {
            $this->logFcm("FCM: Service account file not found at " . $this->serviceAccountPath);
            return null;
        }
        $this->logFcm("Service account file found.");

        $key = json_decode(file_get_contents($this->serviceAccountPath), true);
        if (!$key) {
            $this->logFcm("Failed to parse service account JSON.");
            return null;
        }
        
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $now = time();
        $payload = json_encode([
            'iss' => $key['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600
        ]);

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);

        $signature = '';
        if (!openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $key['private_key'], OPENSSL_ALGO_SHA256)) {
            $this->logFcm("openssl_sign() failed. OpenSSL error: " . openssl_error_string());
            return null;
        }
        $base64UrlSignature = $this->base64UrlEncode($signature);

        $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
        $this->logFcm("JWT generated successfully.");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]));
        
        $result = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            $this->logFcm("cURL error while getting access token: " . $curlError);
        }

        $data = json_decode($result, true);
        
        if (isset($data['access_token'])) {
            $this->logFcm("Access token received.");
            return $data['access_token'];
        }
        
        $this->logFcm("Failed to obtain access token. Response: " . $result);
        return null;
    }

    private function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private function getTokensForUser($userId) {
        $query = "SELECT token FROM push_subscriptions WHERE user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $this->logFcm("SQL query for tokens: '$query' with user_id: $userId. Found: " . count($tokens));
        return $tokens;
    }

    private function deleteToken($token) {
        $query = "DELETE FROM push_subscriptions WHERE token = :token";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();
        $this->logFcm("Executed SQL to delete token: '$query'");
    }
}
