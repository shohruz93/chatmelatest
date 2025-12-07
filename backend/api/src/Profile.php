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

        // Update name
        if (isset($data['name']) && !empty($data['name'])) {
            $query = "UPDATE users SET name = :name WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":id", $userId);
            $stmt->execute();
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
    
    public function recordView($viewerId, $viewedId) {
        if ($viewerId == $viewedId) return;

        $query = "INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) 
                  VALUES (:viewer_id, :viewed_id, NOW(), 0) 
                  ON DUPLICATE KEY UPDATE viewed_at = NOW(), seen = 0";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":viewer_id", $viewerId);
        $stmt->bindParam(":viewed_id", $viewedId);
        $stmt->execute();
    }

    public function getGuests($userId) {
        $query = "SELECT u.id, u.name, u.avatar, u.bio, pv.viewed_at 
                  FROM profile_views pv 
                  JOIN users u ON pv.viewer_id = u.id 
                  WHERE pv.viewed_id = :user_id 
                  ORDER BY pv.viewed_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fix guest avatar URLs
        foreach ($guests as &$guest) {
            if ($guest['avatar']) {
                $guest['avatar'] = $guest['avatar'];
            }
        }

        echo json_encode($guests);
    }


    public function getComments($userId) {
        // Get ratings/comments
        $query = "SELECT ur.*, u.name as rater_name, u.avatar as rater_avatar 
                  FROM user_ratings ur 
                  JOIN users u ON ur.rater_id = u.id 
                  WHERE ur.rated_id = :user_id 
                  ORDER BY ur.created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // For each comment, get replies and likes
        foreach ($comments as &$comment) {
            // Fix rater avatar URL
            if ($comment['rater_avatar']) {
                $comment['rater_avatar'] = $comment['rater_avatar'];
            }

            // Get replies
            $query = "SELECT cr.*, u.name as replier_name, u.avatar as replier_avatar 
                      FROM comment_replies cr 
                      JOIN users u ON cr.user_id = u.id 
                      WHERE cr.rating_id = :rating_id 
                      ORDER BY cr.created_at ASC";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":rating_id", $comment['id']);
            $stmt->execute();
            $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fix replier avatar URLs
            foreach ($replies as &$reply) {
                if ($reply['replier_avatar']) {
                    $reply['replier_avatar'] = $reply['replier_avatar'];
                }
            }
            $comment['replies'] = $replies;

            // Get likes count
            $query = "SELECT 
                        SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) as likes,
                        SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) as dislikes
                      FROM comment_likes 
                      WHERE rating_id = :rating_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":rating_id", $comment['id']);
            $stmt->execute();
            $likesData = $stmt->fetch(PDO::FETCH_ASSOC);
            $comment['likes'] = $likesData['likes'] ?? 0;
            $comment['dislikes'] = $likesData['dislikes'] ?? 0;
        }

        echo json_encode($comments);
    }


    public function addReply() {
        $data = json_decode(file_get_contents("php://input"), true);
        $ratingId = $data['ratingId'];
        $userId = $data['userId'];
        $content = $data['content'];

        $query = "INSERT INTO comment_replies (rating_id, user_id, content) VALUES (:rating_id, :user_id, :content)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rating_id", $ratingId);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":content", $content);
        
        if ($stmt->execute()) {
            echo json_encode(["message" => "Reply added"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add reply"]);
        }
    }

    public function likeComment() {
        $data = json_decode(file_get_contents("php://input"), true);
        $ratingId = $data['ratingId'];
        $userId = $data['userId'];
        $type = $data['type']; // 'like' or 'dislike'

        // Check if already liked/disliked
        $query = "INSERT INTO comment_likes (rating_id, user_id, type) 
                  VALUES (:rating_id, :user_id, :type) 
                  ON DUPLICATE KEY UPDATE type = :type_update";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rating_id", $ratingId);
        $stmt->bindParam(":user_id", $userId);
        $stmt->bindParam(":type", $type);
        $stmt->bindParam(":type_update", $type);
        
        if ($stmt->execute()) {
            echo json_encode(["message" => "Action recorded"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to record action"]);
        }
    }

    public function addRating() {
        $data = json_decode(file_get_contents("php://input"), true);
        $raterId = $data['raterId'];
        $ratedId = $data['ratedId'];
        $rating = $data['rating'];
        $comment = $data['comment'] ?? '';
        
        // Always insert a new record (no update)
        $query = "INSERT INTO user_ratings (rater_id, rated_id, rating, comment) VALUES (:rater, :rated, :rating, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rater", $raterId);
        $stmt->bindParam(":rated", $ratedId);
        $stmt->bindParam(":rating", $rating);
        $stmt->bindParam(":comment", $comment);
        
        if ($stmt->execute()) {
            echo json_encode(["message" => "Rating added", "updated" => false]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add rating"]);
        }
    }
    
    public function addComment() {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'];
        $ratedId = $data['ratedId'];
        $comment = $data['comment'] ?? '';
        
        if (empty($comment)) {
            http_response_code(400);
            echo json_encode(["message" => "Comment cannot be empty"]);
            return;
        }
        
        // Insert comment without rating (rating = NULL or 0)
        $query = "INSERT INTO user_ratings (rater_id, rated_id, rating, comment) VALUES (:rater, :rated, NULL, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rater", $userId);
        $stmt->bindParam(":rated", $ratedId);
        $stmt->bindParam(":comment", $comment);
        
        if ($stmt->execute()) {
            echo json_encode(["message" => "Comment added"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add comment"]);
        }
    }

    public function getNewGuestsCount($userId) {
        $query = "SELECT COUNT(*) as count FROM profile_views WHERE viewed_id = :user_id AND seen = 0";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["count" => (int)$result['count']]);
    }

    public function markGuestsAsSeen($userId) {
        $query = "UPDATE profile_views SET seen = 1 WHERE viewed_id = :user_id AND seen = 0";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $userId);
        $stmt->execute();
        echo json_encode(["message" => "Guests marked as seen"]);
    }
}
