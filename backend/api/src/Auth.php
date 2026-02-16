<?php

require_once 'User.php';
require_once 'Config.php';
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
        
        // Merge with profile data passed from frontend (if any)
        if (isset($data['profile'])) {
            $payload = array_merge($data['profile'], $payload);
        }

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
                // Fetch full user profile from database
                $userProfile = $this->user->getProfile($userId);
                
                // Fetch interests
                $query = "SELECT i.id, i.name FROM interests i 
                          JOIN user_interests ui ON i.id = ui.interest_id 
                          WHERE ui.user_id = :user_id";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(":user_id", $userId);
                $stmt->execute();
                $interests = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Generate Session Token (Simple implementation)
                $sessionToken = base64_encode(json_encode([
                    "id" => $userId,
                    "email" => $userData['email'],
                    "exp" => time() + (30 * 24 * 60 * 60) // 30 days
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
                        "avatar" => $userProfile['avatar'], 
                        "photoURL" => $userData['picture'], 
                        "bio" => $userProfile['bio'],
                        "gender" => $userProfile['gender'],
                        "location" => $userProfile['location'],
                        "native_language" => $userProfile['native_language'],
                        "learning_language" => $userProfile['learning_language'],
                        "interests" => $interests,
                        "is_admin" => (int)$userProfile['is_admin']
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

    // Send verification code to email
    public function sendCode() {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? null;

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["message" => "Valid email required"]);
            return;
        }

        // Test account bypass for Google Play Store review
        if ($email === 'tester@chatme.tj') {
            echo json_encode(["message" => "code_sent"]);
            return;
        }

        $code = rand(100000, 999999);
        $expires = time() + (10 * 60); // 10 minutes

        $storeFile = __DIR__ . '/../data/email_codes.json';
        if (!is_dir(dirname($storeFile))) {
            @mkdir(dirname($storeFile), 0755, true);
        }

        $codes = [];
        if (file_exists($storeFile)) {
            $raw = file_get_contents($storeFile);
            $codes = $raw ? json_decode($raw, true) : [];
        }

        $codes[$email] = [
            'code' => (string)$code,
            'expires' => $expires
        ];

        file_put_contents($storeFile, json_encode($codes));

        // Log to debug file (do not expose code in production)
        $logFile = __DIR__ . '/../public/debug_auth.log';
        $logData = date('Y-m-d H:i:s') . " - SendCode to {$email}: {$code}\n";
        file_put_contents($logFile, $logData, FILE_APPEND);

        // Try sending email via PHPMailer using SMTP settings from .env (best-effort)
        try {
            require_once __DIR__ . '/../vendor/autoload.php';

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = Config::get('SMTP_HOST', '');
            $mail->SMTPAuth = true;
            $mail->Username = Config::get('SMTP_USER', '');
            $mail->Password = Config::get('SMTP_PASS', '');
            $secure = Config::get('SMTP_SECURE', 'tls');
            if (strtolower($secure) === 'ssl') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mail->Port = (int)Config::get('SMTP_PORT', 587);

            $from = Config::get('MAIL_FROM', 'no-reply@chatme.tj');
            $fromName = Config::get('MAIL_FROM_NAME', 'Chatme');
            $mail->setFrom($from, $fromName);
            $mail->addAddress($email);

            $mail->isHTML(false);
            $mail->Subject = 'Your Chatme verification code';
            $mail->Body = "Your verification code is: {$code}. It expires in 10 minutes.";

            $mail->send();
        } catch (\Throwable $e) {
            // Log error but continue (code is stored and usable)
            $logFile = __DIR__ . '/../public/debug_auth.log';
            file_put_contents($logFile, date('c') . ' - Mailer error: ' . $e->getMessage() . "\n", FILE_APPEND);
        }

        echo json_encode(["message" => "code_sent"]);
    }

    // Verify code and create session
    public function verifyCode() {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? null;
        $code = isset($data['code']) ? (string)$data['code'] : null;

        if (!$email || !$code) {
            http_response_code(400);
            echo json_encode(["message" => "Email and code required"]);
            return;
        }

        $storeFile = __DIR__ . '/../data/email_codes.json';
        $codes = [];
        if (file_exists($storeFile)) {
            $raw = file_get_contents($storeFile);
            $codes = $raw ? json_decode($raw, true) : [];
        }

        // Test account bypass for Google Play Store review
        if ($email === 'tester@chatme.tj' && (string)$code === '123456') {
            $userId = $this->user->createOrGetByEmail($email);
            if (!$userId) {
                http_response_code(500);
                echo json_encode(["message" => "Failed to create user"]);
                return;
            }

            // Fetch user profile
            $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, is_admin FROM users WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
            $userProfile = $stmt->fetch(PDO::FETCH_ASSOC);

            $sessionToken = base64_encode(json_encode([
                "id" => $userId,
                "email" => $email,
                "exp" => time() + (30 * 24 * 60 * 60) // 30 days
            ]));

            echo json_encode([
                "message" => "Login successful",
                "token" => $sessionToken,
                "user" => [
                    "id" => $userId,
                    "name" => $userProfile['name'],
                    "first_name" => $userProfile['first_name'] ?? '',
                    "family_name" => $userProfile['family_name'] ?? '',
                    "email" => $userProfile['email'],
                    "avatar" => $userProfile['avatar'] ?? null,
                    "bio" => $userProfile['bio'] ?? null,
                    "gender" => $userProfile['gender'] ?? null,
                    "location" => $userProfile['location'] ?? null,
                    "is_admin" => (int)($userProfile['is_admin'] ?? 0)
                ]
            ]);
            return;
        }

        if (!isset($codes[$email])) {
            http_response_code(400);
            echo json_encode(["message" => "No code found for this email"]);
            return;
        }

        $entry = $codes[$email];
        // Trim received code and log for debugging
        $receivedCode = trim($code);
        $logFile = __DIR__ . '/../public/debug_auth.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - Verify attempt for {$email}: provided={$receivedCode}, expected={$entry['code']}\n", FILE_APPEND);

        if (time() > $entry['expires']) {
            unset($codes[$email]);
            file_put_contents($storeFile, json_encode($codes));
            http_response_code(400);
            echo json_encode(["message" => "Code expired"]);
            return;
        }
        if ($entry['code'] !== $receivedCode) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid code"]);
            return;
        }

        // Code valid — create or get user by email
        $userId = $this->user->createOrGetByEmail($email);
        if (!$userId) {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create user"]);
            return;
        }

        // Remove used code
        unset($codes[$email]);
        file_put_contents($storeFile, json_encode($codes));

        // Fetch user profile
        $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, is_admin FROM users WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $userId);
        $stmt->execute();
        $userProfile = $stmt->fetch(PDO::FETCH_ASSOC);

        $sessionToken = base64_encode(json_encode([
            "id" => $userId,
            "email" => $email,
            "exp" => time() + (30 * 24 * 60 * 60) // 30 days
        ]));

        echo json_encode([
            "message" => "Login successful",
            "token" => $sessionToken,
            "user" => [
                "id" => $userId,
                "name" => $userProfile['name'],
                "first_name" => $userProfile['first_name'] ?? '',
                "family_name" => $userProfile['family_name'] ?? '',
                "email" => $userProfile['email'],
                "avatar" => $userProfile['avatar'] ?? null,
                "bio" => $userProfile['bio'] ?? null,
                "gender" => $userProfile['gender'] ?? null,
                "location" => $userProfile['location'] ?? null,
                "is_admin" => (int)($userProfile['is_admin'] ?? 0)
            ]
        ]);
    }
    public static function validateToken($token) {
        $json = base64_decode($token, true);
        if (!$json) {
            error_log("Auth::validateToken - Invalid token encoding: " . substr($token, 0, 10) . "...");
            throw new Exception("Invalid token encoding");
        }
        $data = json_decode($json);
        if (!$data || !isset($data->exp)) {
            error_log("Auth::validateToken - Invalid token data or missing exp: " . $json);
            throw new Exception("Invalid token data");
        }
        if ($data->exp < time()) {
            error_log("Auth::validateToken - Token expired. Exp: " . $data->exp . ", Current: " . time() . ", Diff: " . (time() - $data->exp) . "s");
            throw new Exception("Token expired");
        }
        return $data;
    }
}
