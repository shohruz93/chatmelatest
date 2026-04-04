<?php

require_once 'User.php';
require_once 'Notification.php';
require_once 'TimestampHelper.php';
require_once 'Telegram.php';
require_once 'GamificationController.php';
require_once 'InterestConstants.php';

class Profile {
    private $db;
    private $user;
    private $notification;


    public function __construct($db) {
        $this->db = $db;
        $this->user = new User($db);
        $this->notification = new Notification($db);

    }

    public function get($userId) {
        // Track gamification progress for login/activity
        GamificationController::updateProgress($userId, 'login');

        $profile = $this->user->getProfile($userId);
        if ($profile) {
            $profile['is_admin'] = (int)($profile['is_admin'] ?? 0);
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

            // Get photos (Gallery)
            $photoQuery = "SELECT image_path FROM gallery_images WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 6";
            $photoStmt = $this->db->prepare($photoQuery);
            $photoStmt->bindParam(":user_id", $userId);
            $photoStmt->execute();
            $profile['photos'] = $photoStmt->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode($profile);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "User not found"]);
        }
    }

    public function getByUniqueId($uniqueId) {
        $profile = $this->user->getByUniqueId($uniqueId);
        if ($profile) {
            $userId = $profile['id'];
            $profile['is_admin'] = (int)($profile['is_admin'] ?? 0);
            
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

            // Get photos (Gallery)
            $photoQuery = "SELECT image_path FROM gallery_images WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 6";
            $photoStmt = $this->db->prepare($photoQuery);
            $photoStmt->bindParam(":user_id", $userId);
            $photoStmt->execute();
            $profile['photos'] = $photoStmt->fetchAll(PDO::FETCH_COLUMN);

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
            // Validate all interest keys before processing
            $validation = InterestConstants::validateKeys($data['interests']);
            if (!$validation['valid']) {
                http_response_code(400);
                echo json_encode([
                    "error" => "Invalid interest keys",
                    "invalid_keys" => $validation['invalid_keys']
                ]);
                return;
            }
            
            // Clear existing interests
            $query = "DELETE FROM user_interests WHERE user_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();

            // Add new interests (now validated as keys)
            foreach ($data['interests'] as $interestKey) {
                $interestId = null;
                
                // Check if it's already an ID (numeric) or a key (string)
                if (is_numeric($interestKey)) {
                    $interestId = $interestKey;
                } else {
                    // Try to find existing interest by name (key)
                    $query = "SELECT id FROM interests WHERE name = :name LIMIT 1";
                    $stmt = $this->db->prepare($query);
                    $stmt->bindParam(":name", $interestKey);
                    $stmt->execute();
                    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($existing) {
                        $interestId = $existing['id'];
                    } else {
                        // Create new interest with the key as the name
                        $query = "INSERT INTO interests (name) VALUES (:name)";
                        $stmt = $this->db->prepare($query);
                        $stmt->bindParam(":name", $interestKey);
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
            $uploadDir = __DIR__ . '/../public_html/uploads/';
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
        $viewerId = (int)$viewerId;
        $viewedId = (int)$viewedId;
        
        if (!$viewerId || !$viewedId) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid user IDs: viewerId=$viewerId, viewedId=$viewedId"]);
            error_log("Invalid user IDs in recordView: viewerId=$viewerId, viewedId=$viewedId");
            return;
        }
        
        if ($viewerId == $viewedId) {
            http_response_code(400);
            echo json_encode(["error" => "Cannot view own profile"]);
            return;
        }

        $success = false;
        
        try {
            $query = "INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) 
                      VALUES (?, ?, UNIX_TIMESTAMP(), 0) 
                      ON DUPLICATE KEY UPDATE viewed_at = UNIX_TIMESTAMP(), seen = 0";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$viewerId, $viewedId]);
            $success = true;
            error_log("Profile view recorded with seen column for viewer $viewerId, viewed $viewedId");
        } catch (Exception $e) {
            error_log("Error with seen column: " . $e->getMessage());
            
            try {
                $query = "INSERT INTO profile_views (viewer_id, viewed_id, viewed_at) 
                          VALUES (?, ?, UNIX_TIMESTAMP()) 
                          ON DUPLICATE KEY UPDATE viewed_at = UNIX_TIMESTAMP()";
                $stmt = $this->db->prepare($query);
                $stmt->execute([$viewerId, $viewedId]);
                $success = true;
                error_log("Profile view recorded without seen column for viewer $viewerId, viewed $viewedId");
            } catch (Exception $e2) {
                error_log("Error recording profile view (both attempts failed): " . $e2->getMessage());
            }
        }

        try {
            $viewerName = $this->user->getNameById($viewerId);
            $title = 'You have a new guest';
            $body = ($viewerName ?: 'Someone') . ' visited your profile.';
            $payload = [
                'type' => 'guest',
                'viewerId' => $viewerId
            ];
            $this->notification->send($viewedId, $title, $body, $payload);

            
            // Track gamification progress for the viewer
            GamificationController::updateProgress($viewerId, 'view_profile');
        } catch (Exception $e) {
            error_log("Error sending guest notification: " . $e->getMessage());
        }
        
        if ($success) {
            echo json_encode(["message" => "Profile view recorded"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to record profile view"]);
        }
    }

    public function getGuests($userId) {
        $userId = (int)$userId;
        
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid user ID"]);
            return;
        }
        
        try {
            // Cleanup old guests (older than 1 month) for this user
            // viewed_at is stored as Unix timestamp, so compare with Unix timestamp
            $oneMonthAgo = time() - (30 * 24 * 60 * 60);
            $cleanupQuery = "DELETE FROM profile_views WHERE viewed_id = ? AND viewed_at < ?";
            $cleanupStmt = $this->db->prepare($cleanupQuery);
            $cleanupStmt->execute([$userId, $oneMonthAgo]);
            error_log("Cleaned up old guests for user $userId");
        } catch (Exception $e) {
            error_log("Error cleaning up guests: " . $e->getMessage());
        }

        try {
            $query = "SELECT u.id, u.name, u.avatar, u.bio, pv.viewed_at 
                      FROM profile_views pv 
                      JOIN users u ON pv.viewer_id = u.id 
                      WHERE pv.viewed_id = ? 
                      ORDER BY pv.viewed_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Found " . count($guests) . " guests for user $userId");
            
            // viewed_at is already stored as Unix timestamp, no conversion needed
            // Ensure it's cast as integer
            foreach ($guests as &$guest) {
                $guest['viewed_at'] = (int)$guest['viewed_at'];
            }

            echo json_encode($guests);
        } catch (Exception $e) {
            error_log("Error fetching guests: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch guests: " . $e->getMessage()]);
        }
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

        TimestampHelper::convertRowsToUnix($comments, ['created_at']);

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

            TimestampHelper::convertRowsToUnix($replies, ['created_at']);

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
            // Track gamification progress
            GamificationController::updateProgress($userId, 'like_comment');
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
        
        if (mb_strlen($comment) > 250) {
            http_response_code(400);
            echo json_encode(["message" => "Comment cannot exceed 250 characters"]);
            return;
        }
        
        // Always insert a new record (no update)
        $query = "INSERT INTO user_ratings (rater_id, rated_id, rating, comment) VALUES (:rater, :rated, :rating, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rater", $raterId);
        $stmt->bindParam(":rated", $ratedId);
        $stmt->bindParam(":rating", $rating);
        $stmt->bindParam(":comment", $comment);
        
        if ($stmt->execute()) {
            // Track gamification progress
            GamificationController::updateProgress($raterId, 'add_rating');
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
        
        if (mb_strlen($comment) > 250) {
            http_response_code(400);
            echo json_encode(["message" => "Comment cannot exceed 250 characters"]);
            return;
        }
        
        if (empty($comment)) {
            http_response_code(400);
            echo json_encode(["message" => "Comment cannot be empty"]);
            return;
        }
        
        // Insert comment without rating (rating = 0)
        $query = "INSERT INTO user_ratings (rater_id, rated_id, rating, comment) VALUES (:rater, :rated, 0, :comment)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":rater", $userId);
        $stmt->bindParam(":rated", $ratedId);
        $stmt->bindParam(":comment", $comment);
        
        if ($stmt->execute()) {
            try {
                $commenterName = $this->user->getNameById($userId);
                $commentPreview = substr($comment, 0, 100);

                
                // Track gamification progress
                GamificationController::updateProgress($userId, 'add_comment');
            } catch (Exception $e) {
                error_log("Error sending comment notification: " . $e->getMessage());
            }
            echo json_encode(["message" => "Comment added"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add comment"]);
        }
    }

    public function getNewGuestsCount($userId) {
        try {
            $query = "SELECT COUNT(*) as count FROM profile_views WHERE viewed_id = :user_id AND seen = 0";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(["count" => (int)$result['count']]);
        } catch (Exception $e) {
            $query = "SELECT COUNT(*) as count FROM profile_views WHERE viewed_id = :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(["count" => (int)$result['count']]);
        }
    }

    public function markGuestsAsSeen($userId) {
        try {
            $query = "UPDATE profile_views SET seen = 1 WHERE viewed_id = :user_id AND seen = 0";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            echo json_encode(["message" => "Guests marked as seen"]);
        } catch (Exception $e) {
            echo json_encode(["message" => "Guests marked as seen"]);
        }
    }

    public function follow() {
        $data = json_decode(file_get_contents("php://input"), true);
        $followerId = $data['followerId'] ?? 0;
        $followedId = $data['followedId'] ?? 0;

        if (!$followerId || !$followedId) {
            http_response_code(400);
            echo json_encode(["error" => "Both followerId and followedId are required"]);
            return;
        }

        if ($followerId == $followedId) {
            http_response_code(400);
            echo json_encode(["error" => "Cannot follow yourself"]);
            return;
        }

        try {
            $query = "INSERT IGNORE INTO follows (follower_id, followed_id) VALUES (:follower_id, :followed_id)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":follower_id", $followerId);
            $stmt->bindParam(":followed_id", $followedId);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                // Send notification
                try {
                    $followerName = $this->user->getNameById($followerId);
                    $title = 'New follower';
                    $body = ($followerName ?: 'Someone') . ' started following you.';
                    $payload = [
                        'type' => 'follow',
                        'followerId' => $followerId
                    ];
                    $this->notification->send($followedId, $title, $body, $payload);

                } catch (Exception $e) {
                    error_log("Error sending follow notification: " . $e->getMessage());
                }
            }

            echo json_encode(["success" => true, "message" => "Followed successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }

    public function unfollow() {
        $data = json_decode(file_get_contents("php://input"), true);
        $followerId = $data['followerId'] ?? 0;
        $followedId = $data['followedId'] ?? 0;

        if (!$followerId || !$followedId) {
            http_response_code(400);
            echo json_encode(["error" => "Both followerId and followedId are required"]);
            return;
        }

        try {
            $query = "DELETE FROM follows WHERE follower_id = :follower_id AND followed_id = :followed_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":follower_id", $followerId);
            $stmt->bindParam(":followed_id", $followedId);
            $stmt->execute();

            echo json_encode(["success" => true, "message" => "Unfollowed successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }

    public function getFollowStatus($followerId, $followedId) {
        try {
            $query = "SELECT 1 FROM follows WHERE follower_id = :follower_id AND followed_id = :followed_id LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":follower_id", $followerId);
            $stmt->bindParam(":followed_id", $followedId);
            $stmt->execute();

            $isFollowing = $stmt->fetchColumn() ? true : false;
            echo json_encode(["isFollowing" => $isFollowing]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }

    public function getFollowers($userId) {
        try {
            $query = "SELECT u.id, u.name, u.avatar, u.bio, u.gender, u.location, u.unique_id, u.last_active, f.created_at as followed_at
                      FROM follows f
                      JOIN users u ON f.follower_id = u.id
                      WHERE f.followed_id = :user_id
                      ORDER BY f.created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            
            $followers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($followers);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }

    public function getFollowing($userId) {
        try {
            $query = "SELECT u.id, u.name, u.avatar, u.bio, u.gender, u.location, u.unique_id, u.last_active, f.created_at as followed_at
                      FROM follows f
                      JOIN users u ON f.followed_id = u.id
                      WHERE f.follower_id = :user_id
                      ORDER BY f.created_at DESC";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $userId);
            $stmt->execute();
            
            $following = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($following);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }

    public function getFollowCounts($userId) {
        try {
            $query = "SELECT 
                        (SELECT COUNT(*) FROM follows WHERE followed_id = :id1) as followers_count,
                        (SELECT COUNT(*) FROM follows WHERE follower_id = :id2) as following_count";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id1", $userId);
            $stmt->bindParam(":id2", $userId);
            $stmt->execute();
            
            $counts = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode([
                "followers" => (int)$counts['followers_count'],
                "following" => (int)$counts['following_count']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database error"]);
        }
    }
}
