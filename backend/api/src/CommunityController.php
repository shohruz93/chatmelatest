<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/TimestampHelper.php';

class CommunityController {
    private $db;
    private $maxVideoDuration = 60; // seconds

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Create a new community post
     */
    public function createPost($userId) {
        $contentType = $_POST['content_type'] ?? 'text';
        $textContent = $_POST['text_content'] ?? '';
        $videoDuration = 0;
        $mediaPath = null;

        if (!in_array($contentType, ['text', 'image', 'video'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid content type']);
            return;
        }

        // Handle media upload
        if ($contentType !== 'text') {
            if (!isset($_FILES['media']) || $_FILES['media']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['error' => 'No media file provided']);
                return;
            }

            $file = $_FILES['media'];
            
            if ($contentType === 'image') {
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!in_array($file['type'], $allowedTypes)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid image type']);
                    return;
                }
            } elseif ($contentType === 'video') {
                $allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
                if (!in_array($file['type'], $allowedTypes)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid video type. Only MP4, WebM, MOV allowed.']);
                    return;
                }

                // Get video duration from client
                $videoDuration = intval($_POST['video_duration'] ?? 0);
                if ($videoDuration > $this->maxVideoDuration) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Video duration exceeds 1 minute limit']);
                    return;
                }
            }

            // Max 50MB for videos, 10MB for images
            $maxSize = $contentType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(['error' => 'File too large']);
                return;
            }

            $uploadDir = __DIR__ . '/../public_html/uploads/community/' . $userId . '/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            if ($contentType === 'image') {
                require_once __DIR__ . '/ImageOptimizer.php';
                $filename = uniqid() . '_' . time() . '.webp';
                $filepath = $uploadDir . $filename;
                $mediaPath = '/uploads/community/' . $userId . '/' . $filename;
                $uploaded = ImageOptimizer::optimizeToWebp($file['tmp_name'], $filepath, 800, 800, 80);
            } else {
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = uniqid() . '_' . time() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                $mediaPath = '/uploads/community/' . $userId . '/' . $filename;
                $uploaded = move_uploaded_file($file['tmp_name'], $filepath);
            }

            if (!$uploaded) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save file']);
                return;
            }
        }

        // Validate text content for text posts
        if ($contentType === 'text' && empty(trim($textContent))) {
            http_response_code(400);
            echo json_encode(['error' => 'Text content is required for text posts']);
            return;
        }

        $now = TimestampHelper::now();

        $stmt = $this->db->prepare("
            INSERT INTO community_posts (user_id, content_type, text_content, media_path, video_duration, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $contentType, $textContent, $mediaPath, $videoDuration, $now]);
        $postId = $this->db->lastInsertId();

        // Get user info
        $stmt = $this->db->prepare("SELECT name, avatar FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'post' => [
                'id' => $postId,
                'user_id' => $userId,
                'user_name' => $user['name'],
                'user_avatar' => $user['avatar'],
                'content_type' => $contentType,
                'text_content' => $textContent,
                'media_path' => $mediaPath,
                'video_duration' => $videoDuration,
                'likes_count' => 0,
                'comments_count' => 0,
                'created_at' => $now
            ]
        ]);
    }

    /**
     * Get community feed with pagination
     */
    public function getFeed($viewerId = null, $page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;

        $sort = $_GET['sort'] ?? 'newest';
        $timeRange = $_GET['time_range'] ?? 'all';

        $orderBy = "ORDER BY RAND()";
        if ($sort === 'likes') {
            $orderBy = "ORDER BY cp.likes_count DESC, RAND()";
        } elseif ($sort === 'comments') {
            $orderBy = "ORDER BY cp.comments_count DESC, RAND()";
        } elseif ($sort === 'views') {
            $orderBy = "ORDER BY cp.views_count DESC, RAND()";
        }

        $whereClause = "WHERE cp.user_id != ?";
        if ($timeRange !== 'all') {
            $now = TimestampHelper::now();
            $startTime = 0;
            if ($timeRange === 'day') {
                $startTime = $now - (24 * 60 * 60);
            } elseif ($timeRange === 'week') {
                $startTime = $now - (7 * 24 * 60 * 60);
            } elseif ($timeRange === 'month') {
                $startTime = $now - (30 * 24 * 60 * 60);
            }
            $whereClause = "WHERE cp.created_at >= " . $startTime . " AND cp.user_id != ?";
        }
        
        $stmt = $this->db->prepare("
            SELECT cp.*, 
                   u.name as user_name, 
                   u.avatar as user_avatar,
                   u.native_language,
                   u.learning_language,
                   u.is_vip,
                   CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                   CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN community_reactions cr ON cp.id = cr.post_id AND cr.user_id = ?
            LEFT JOIN follows f ON f.followed_id = cp.user_id AND f.follower_id = ?
            $whereClause
            $orderBy
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $viewerId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(2, $viewerId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(3, $viewerId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(4, (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(5, (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get recent comments for each post (max 2)
        foreach ($posts as &$post) {
            $stmt = $this->db->prepare("
                SELECT cc.*, u.name as user_name, u.avatar as user_avatar, u.is_vip
                FROM community_comments cc
                JOIN users u ON cc.user_id = u.id
                WHERE cc.post_id = ?
                ORDER BY cc.created_at DESC
                LIMIT 2
            ");
            $stmt->execute([$post['id']]);
            $post['recent_comments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($posts);
    }


    /**
     * Get user's posts
     */
    public function getUserPosts($userId, $viewerId = null, $page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->prepare("
            SELECT cp.*, 
                   u.name as user_name, 
                   u.avatar as user_avatar,
                   u.native_language,
                   u.learning_language,
                   u.is_vip,
                   CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                   CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM community_posts cp
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN community_reactions cr ON cp.id = cr.post_id AND cr.user_id = ?
            LEFT JOIN follows f ON f.followed_id = cp.user_id AND f.follower_id = ?
            WHERE cp.user_id = ?
            ORDER BY cp.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $viewerId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(2, $viewerId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(3, $userId, PDO::PARAM_INT);
        $stmt->bindValue(4, (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(5, (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($posts);
    }

    /**
     * Like/unlike a post
     */
    public function react($userId) {
        $data = json_decode(file_get_contents('php://input'), true);
        $postId = $data['postId'] ?? null;

        if (!$postId) {
            http_response_code(400);
            echo json_encode(['error' => 'Post ID required']);
            return;
        }

        // Check if post exists
        $stmt = $this->db->prepare("SELECT id, likes_count FROM community_posts WHERE id = ?");
        $stmt->execute([$postId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found']);
            return;
        }

        $now = TimestampHelper::now();

        // Check for existing like
        $stmt = $this->db->prepare("SELECT id FROM community_reactions WHERE post_id = ? AND user_id = ?");
        $stmt->execute([$postId, $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Remove like
            $stmt = $this->db->prepare("DELETE FROM community_reactions WHERE id = ?");
            $stmt->execute([$existing['id']]);
            
            $stmt = $this->db->prepare("UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = ?");
            $stmt->execute([$postId]);
            $liked = false;
        } else {
            // Add like
            $stmt = $this->db->prepare("INSERT IGNORE INTO community_reactions (post_id, user_id, created_at) VALUES (?, ?, ?)");
            $stmt->execute([$postId, $userId, $now]);
            
            if ($stmt->rowCount() > 0) {
                $stmt = $this->db->prepare("UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?");
                $stmt->execute([$postId]);
                $liked = true;
            } else {
                // If it already existed but for some reason wasn't caught by the previous check, 
                // we treat it as already liked.
                $liked = true;
            }
        }

        // Get updated count
        $stmt = $this->db->prepare("SELECT likes_count FROM community_posts WHERE id = ?");
        $stmt->execute([$postId]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'liked' => $liked,
            'likes_count' => $updated['likes_count']
        ]);
    }

    /**
     * Add a comment to a post
     */
    public function addComment($userId) {
        $data = json_decode(file_get_contents('php://input'), true);
        $postId = $data['postId'] ?? null;
        $content = trim($data['content'] ?? '');

        if (!$postId || empty($content)) {
            http_response_code(400);
            echo json_encode(['error' => 'Post ID and content required']);
            return;
        }

        // Check if post exists
        $stmt = $this->db->prepare("SELECT id FROM community_posts WHERE id = ?");
        $stmt->execute([$postId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found']);
            return;
        }

        $now = TimestampHelper::now();

        $stmt = $this->db->prepare("INSERT INTO community_comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$postId, $userId, $content, $now]);
        $commentId = $this->db->lastInsertId();

        // Update comment count
        $stmt = $this->db->prepare("UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?");
        $stmt->execute([$postId]);

        // Get user info and post author info
        $stmt = $this->db->prepare("SELECT u.name, u.avatar, u.is_vip, cp.user_id as author_id 
                                    FROM users u, community_posts cp 
                                    WHERE u.id = ? AND cp.id = ?");
        $stmt->execute([$userId, $postId]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);

        // Send notification to post author if commenter is not the author
        if ($info && $info['author_id'] != $userId) {
            require_once __DIR__ . '/Notification.php';
            $notif = new Notification($this->db);
            $title = "New Comment";
            $body = $info['name'] . " commented on your post: " . substr($content, 0, 50) . "...";
            $payload = [
                'type' => 'comment',
                'postId' => $postId,
                'commentId' => $commentId
            ];
            $notif->send($info['author_id'], $title, $body, $payload);
        }

        echo json_encode([
            'success' => true,
            'comment' => [
                'id' => $commentId,
                'user_id' => $userId,
                'user_name' => $info['name'],
                'user_avatar' => $info['avatar'],
                'is_vip' => $info['is_vip'],
                'content' => $content,
                'created_at' => $now
            ]
        ]);
    }

    /**
     * Get comments for a post
     */
    public function getComments($postId, $page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->prepare("
            SELECT cc.*, u.name as user_name, u.avatar as user_avatar, u.is_vip
            FROM community_comments cc
            JOIN users u ON cc.user_id = u.id
            WHERE cc.post_id = ?
            ORDER BY cc.created_at ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $postId, PDO::PARAM_INT);
        $stmt->bindValue(2, (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(3, (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($comments);
    }

    /**
     * Delete a post
     */
    public function deletePost($postId, $userId) {
        // Check ownership
        $stmt = $this->db->prepare("SELECT id, media_path FROM community_posts WHERE id = ? AND user_id = ?");
        $stmt->execute([$postId, $userId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found or not authorized']);
            return;
        }

        // Delete media file
        if ($post['media_path']) {
            $filepath = __DIR__ . '/../public_html' . $post['media_path'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
        }

        // Delete from database (cascades to reactions and comments)
        $stmt = $this->db->prepare("DELETE FROM community_posts WHERE id = ?");
        $stmt->execute([$postId]);

        echo json_encode(['success' => true]);
    }
    /**
     * Increment view count for a post
     */
    public function viewPost($userId = null) {
        $data = json_decode(file_get_contents('php://input'), true);
        $postId = $data['postId'] ?? null;

        if (!$postId) {
            http_response_code(400);
            echo json_encode(['error' => 'Post ID required']);
            return;
        }

        // If no user ID provided (e.g. guest), just increment (or maybe we shouldn't? For now allowing it but ideally we track by API consumer IP or something if needed, but request was for per user)
        // If user ID is provided, check throttling
        if ($userId) {
            $now = TimestampHelper::now();
            // Get start of today (midnight)
            // Assuming TimestampHelper::now() returns unix timestamp. 
            // We can just use PHP's date/strtotime relative to that or just simple math if we ignore timezones for simplicity, 
            // but better to respect local time or UTC. Let's assume UTC for backend consistency.
            // Actually, simpler: check if a record exists for this user/post within the last 24 hours? 
            // Or "one time per day" usually means calendar day.
            // Let's go with: check if record exists created > start of today.
            
            $startOfToday = strtotime("today midnight", $now); 
            
            // Check if already viewed today
            $stmt = $this->db->prepare("
                SELECT id FROM community_post_views 
                WHERE user_id = ? AND post_id = ? AND created_at >= ?
                LIMIT 1
            ");
            $stmt->execute([$userId, $postId, $startOfToday]);
            if ($stmt->fetch()) {
                // Already viewed today
                echo json_encode(['success' => true, 'viewed' => false]);
                return;
            }

            // Record new view
            $stmt = $this->db->prepare("INSERT INTO community_post_views (user_id, post_id, created_at) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $postId, $now]);
        }

        $stmt = $this->db->prepare("UPDATE community_posts SET views_count = views_count + 1 WHERE id = ?");
        $stmt->execute([$postId]);

        echo json_encode(['success' => true, 'viewed' => true]);
    }
}
