<?php

require_once 'User.php';

class Profile {
    private $db;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
    }

    public function get($userId) {
        $profile = $this->user->getProfile($userId);
        if ($profile) {
            // Get interests
            $query = "SELECT i.id, i.name FROM interests i 
                      JOIN user_interests ui ON i.id = ui.interest_id 
                      WHERE ui.user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            $profile['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get ratings
            $query = "SELECT AVG(rating) as average_rating, COUNT(*) as rating_count FROM user_ratings WHERE rated_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            $ratingData = $stmt->fetch(PDO::FETCH_ASSOC);
            $profile['rating'] = $ratingData['average_rating'] ? round($ratingData['average_rating'], 1) : 0;
            $profile['rating_count'] = $ratingData['rating_count'];

            echo json_encode($profile);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "User not found"]);
        }
    }

    public function update($userId) {
        // Check if it's FormData (multipart/form-data) first
        if (!empty($_POST)) {
            $data = $_POST;
        } else {
            // Otherwise try JSON input
            $input = file_get_contents("php://input");
            $data = json_decode($input, true);
            if (!$data) {
                $data = [];
            }
        }

        // Update bio
        if (isset($data['bio'])) {
            $query = "UPDATE users SET bio = :bio WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":bio", $data['bio']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
        }

        // Update gender
        if (isset($data['gender'])) {
            $query = "UPDATE users SET gender = :gender WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":gender", $data['gender']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
        }

        // Update location
        if (isset($data['location'])) {
            $query = "UPDATE users SET location = :location WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":location", $data['location']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
        }

        // Update native_language
        if (isset($data['native_language'])) {
            $query = "UPDATE users SET native_language = :native_language WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":native_language", $data['native_language']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
        }

        // Update learning_language
        if (isset($data['learning_language'])) {
            $query = "UPDATE users SET learning_language = :learning_language WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":learning_language", $data['learning_language']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
        }

        if (isset($data['interests']) && is_array($data['interests'])) {
            // Clear existing interests
            $query = "DELETE FROM user_interests WHERE user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();

            // Add new interests
            foreach ($data['interests'] as $interest) {
                $interestId = null;
                
                // Check if it's already an ID (numeric) or a name (string)
                if (is_numeric($interest)) {
                    $interestId = $interest;
                } else {
                    // Try to find existing interest by name
                    $query = "SELECT id FROM interests WHERE name = :name LIMIT 1";
                    $stmt = $this->db->prepare($query);
                    $stmt->bindParam(":name", $interest);
                    $stmt->execute();
                    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($existing) {
                        $interestId = $existing['id'];
                    } else {
                        // Create new interest
                        $query = "INSERT INTO interests (name) VALUES (:name)";
                        $stmt = $this->db->prepare($query);
                        $stmt->bindParam(":name", $interest);
                        $stmt->execute();
                        $interestId = $this->db->lastInsertId();
                    }
                }
                
                // Link interest to user
                if ($interestId) {
                    $query = "INSERT INTO user_interests (user_id, interest_id) VALUES (:user_id, :interest_id)";
                    $stmt = $this->db->prepare($query);
                    $stmt->bindParam(":user_id", $userId);
                    $stmt->bindParam(":interest_id", $interestId);
                    $stmt->execute();
                }
            }
        }

        // Handle Avatar Upload
        $avatarUrl = null;
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../public/uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            $fileType = $_FILES['avatar']['type'];
            
            if (!in_array($fileType, $allowedTypes)) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed."]);
                return;
            }
            
            // Validate file size (5MB max)
            $maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if ($_FILES['avatar']['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(["error" => "File too large. Maximum size is 5MB."]);
                return;
            }
            
            // Get old avatar to delete later
            $query = "SELECT avatar FROM users WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
            $oldAvatar = $stmt->fetch(PDO::FETCH_ASSOC)['avatar'] ?? null;
            
            // Generate unique filename
            $extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
            $fileName = uniqid('avatar_') . '_' . time() . '.' . $extension;
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['avatar']['tmp_name'], $targetPath)) {
                $avatarUrl = '/uploads/' . $fileName;
                
                // Update database
                $query = "UPDATE users SET avatar = :avatar WHERE id = :id";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(":avatar", $avatarUrl);
                $stmt->bindParam(":id", $userId);
                $stmt->execute();
                
                // Delete old avatar file if it exists
                if ($oldAvatar && file_exists($uploadDir . basename($oldAvatar))) {
                    unlink($uploadDir . basename($oldAvatar));
                }
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to upload file."]);
                return;
            }
        }

        echo json_encode([
            "message" => "Profile updated successfully",
            "avatar" => $avatarUrl
        ]);
    }
    
    public function addRating() {
        $data = json_decode(file_get_contents("php://input"), true);
        $raterId = $data['raterId'];
        $ratedId = $data['ratedId'];
        $rating = $data['rating'];
        $comment = $data['comment'] ?? '';
        
        $query = "INSERT INTO user_ratings (rater_id, rated_id, rating, comment) VALUES (:rater, :rated, :rating, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rater", $raterId);
        $stmt->bindParam(":rated", $ratedId);
        $stmt->bindParam(":rating", $rating);
        $stmt->bindParam(":comment", $comment);
        
        if ($stmt->execute()) {
            echo json_encode(["message" => "Rating added"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add rating"]);
        }
    }
}
