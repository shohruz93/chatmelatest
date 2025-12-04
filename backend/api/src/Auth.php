<?php

require_once 'User.php';
// In a real app, use firebase/php-jwt
// For this demo, we'll do a simple implementation or mock

class Auth {
    private $db;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
    }

    public function login() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['token'])) {
            http_response_code(400);
            echo json_encode(["message" => "Token required"]);
            return;
        }

        // Verify Google Token using Google's tokeninfo endpoint
        // This avoids needing external libraries for now
        $idToken = $data['token'];
        $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . $idToken;
        
        // Use curl for better error handling than file_get_contents
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        // DISABLE SSL VERIFICATION FOR LOCAL DEVELOPMENT
        // In production, you should configure a proper cacert.pem
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch); // Capture curl error
        curl_close($ch);

        // Debug logging
        $logFile = __DIR__ . '/../public/debug_auth.log';
        $logData = date('Y-m-d H:i:s') . " - Token: " . substr($idToken, 0, 10) . "...\n";
        $logData .= "Response Code: " . $httpCode . "\n";
        $logData .= "Curl Error: " . $curlError . "\n";
        $logData .= "Response Body: " . $response . "\n------------------\n";
        file_put_contents($logFile, $logData, FILE_APPEND);

        if ($httpCode !== 200 || !$response) {
            http_response_code(401);
            echo json_encode([
                "message" => "DEBUG: Invalid token verification failed",
                "debug_error" => $curlError,
                "debug_http_code" => $httpCode,
                "google_response" => $response
            ]);
            return;
        }

        $payload = json_decode($response, true);

        // Check if token is expired (Google checks this, but good to be sure)
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            http_response_code(401);
            echo json_encode(["message" => "Token expired"]);
            return;
        }

        if (isset($payload['sub'])) {
            // Map Google payload to our user structure
            // Google returns 'picture' for avatar, 'sub' for ID
            // Also extract given_name and family_name if available
            $userData = [
                'sub' => $payload['sub'],
                'email' => $payload['email'] ?? '',
                'name' => $payload['name'] ?? 'User',
                'given_name' => $payload['given_name'] ?? '',
                'family_name' => $payload['family_name'] ?? '',
                'picture' => $payload['picture'] ?? ''
            ];

            $userId = $this->user->createOrUpdate($userData);
            
            if ($userId) {
                // Fetch full user profile from database to get avatar and other fields
                $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, is_admin FROM users WHERE id = :id";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(":id", $userId);
                $stmt->execute();
                $userProfile = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Generate Session Token (Simple implementation)
                // In production, use a proper JWT library
                $sessionToken = base64_encode(json_encode([
                    "id" => $userId,
                    "email" => $userData['email'],
                    "exp" => time() + (24 * 60 * 60) // 24 hours
                ]));

                echo json_encode([
                    "message" => "Login successful",
                    "token" => $sessionToken,
                    "user" => [
                        "id" => $userId,
                        "name" => $userProfile['name'] ?: $userData['name'],
                        "first_name" => $userProfile['first_name'] ?: $userData['given_name'],
                        "family_name" => $userProfile['family_name'] ?: $userData['family_name'],
                        "email" => $userProfile['email'] ?: $userData['email'],
                        "avatar" => $userProfile['avatar'], // Database avatar takes priority
                        "photoURL" => $userData['picture'], // Keep Google picture as fallback
                        "bio" => $userProfile['bio'],
                        "gender" => $userProfile['gender'],
                        "location" => $userProfile['location'],
                        "is_admin" => $userProfile['is_admin']
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Database error during login"]);
            }
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Invalid token payload"]);
        }
    }
}
