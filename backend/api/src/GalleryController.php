<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/TimestampHelper.php';

class GalleryController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Upload a gallery image
     */
    public function upload($userId) {
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No image file provided']);
            return;
        }

        $file = $_FILES['image'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.']);
            return;
        }

        // Max 10MB
        if ($file['size'] > 10 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'File too large. Maximum 10MB allowed.']);
            return;
        }

        $uploadDir = __DIR__ . '/../public_html/uploads/gallery/' . $userId . '/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        require_once __DIR__ . '/ImageOptimizer.php';
        $filename = uniqid() . '_' . time() . '.webp';
        $filepath = $uploadDir . $filename;
        $relativePath = '/uploads/gallery/' . $userId . '/' . $filename;

        if (!ImageOptimizer::optimizeToWebp($file['tmp_name'], $filepath, 800, 800, 80)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save file']);
            return;
        }

        $caption = $_POST['caption'] ?? '';
        $now = TimestampHelper::now();

        $stmt = $this->db->prepare("INSERT INTO gallery_images (user_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $relativePath, $caption, $now]);
        $imageId = $this->db->lastInsertId();

        echo json_encode([
            'success' => true,
            'image' => [
                'id' => $imageId,
                'image_path' => $relativePath,
                'caption' => $caption,
                'likes_count' => 0,
                'dislikes_count' => 0,
                'created_at' => $now
            ]
        ]);
    }

    /**
     * Get user's gallery images
     */
    public function getGallery($userId, $viewerId = null) {
        $stmt = $this->db->prepare("
            SELECT gi.*, 
                   CASE WHEN gr.reaction_type = 'like' THEN 1 ELSE 0 END as user_liked,
                   CASE WHEN gr.reaction_type = 'dislike' THEN 1 ELSE 0 END as user_disliked
            FROM gallery_images gi
            LEFT JOIN gallery_reactions gr ON gi.id = gr.image_id AND gr.user_id = ?
            WHERE gi.user_id = ?
            ORDER BY gi.created_at DESC
        ");
        $stmt->execute([$viewerId ?? 0, $userId]);
        $images = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($images);
    }

    /**
     * React to a gallery image (like/dislike)
     */
    public function react($userId) {
        $data = json_decode(file_get_contents('php://input'), true);
        $imageId = $data['imageId'] ?? null;
        $reactionType = $data['type'] ?? null;

        if (!$imageId || !in_array($reactionType, ['like', 'dislike'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request']);
            return;
        }

        // Check if image exists
        $stmt = $this->db->prepare("SELECT id, likes_count, dislikes_count FROM gallery_images WHERE id = ?");
        $stmt->execute([$imageId]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$image) {
            http_response_code(404);
            echo json_encode(['error' => 'Image not found']);
            return;
        }

        $now = TimestampHelper::now();

        // Check for existing reaction
        $stmt = $this->db->prepare("SELECT id, reaction_type FROM gallery_reactions WHERE image_id = ? AND user_id = ?");
        $stmt->execute([$imageId, $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            if ($existing['reaction_type'] === $reactionType) {
                // Remove reaction (toggle off)
                $stmt = $this->db->prepare("DELETE FROM gallery_reactions WHERE id = ?");
                $stmt->execute([$existing['id']]);
                
                $countField = $reactionType === 'like' ? 'likes_count' : 'dislikes_count';
                $stmt = $this->db->prepare("UPDATE gallery_images SET $countField = $countField - 1 WHERE id = ?");
                $stmt->execute([$imageId]);
            } else {
                // Change reaction type
                $stmt = $this->db->prepare("UPDATE gallery_reactions SET reaction_type = ?, created_at = ? WHERE id = ?");
                $stmt->execute([$reactionType, $now, $existing['id']]);
                
                $oldField = $existing['reaction_type'] === 'like' ? 'likes_count' : 'dislikes_count';
                $newField = $reactionType === 'like' ? 'likes_count' : 'dislikes_count';
                $stmt = $this->db->prepare("UPDATE gallery_images SET $oldField = $oldField - 1, $newField = $newField + 1 WHERE id = ?");
                $stmt->execute([$imageId]);
            }
        } else {
            // Add new reaction
            $stmt = $this->db->prepare("INSERT INTO gallery_reactions (image_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?)");
            $stmt->execute([$imageId, $userId, $reactionType, $now]);
            
            $countField = $reactionType === 'like' ? 'likes_count' : 'dislikes_count';
            $stmt = $this->db->prepare("UPDATE gallery_images SET $countField = $countField + 1 WHERE id = ?");
            $stmt->execute([$imageId]);
        }

        // Get updated counts
        $stmt = $this->db->prepare("SELECT likes_count, dislikes_count FROM gallery_images WHERE id = ?");
        $stmt->execute([$imageId]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'likes_count' => $updated['likes_count'],
            'dislikes_count' => $updated['dislikes_count']
        ]);
    }

    /**
     * Delete a gallery image
     */
    public function delete($imageId, $userId) {
        // Check ownership
        $stmt = $this->db->prepare("SELECT id, image_path FROM gallery_images WHERE id = ? AND user_id = ?");
        $stmt->execute([$imageId, $userId]);
        $image = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$image) {
            http_response_code(404);
            echo json_encode(['error' => 'Image not found or not authorized']);
            return;
        }

        // Delete file
        $filepath = __DIR__ . '/../public_html' . $image['image_path'];
        if (file_exists($filepath)) {
            unlink($filepath);
        }

        // Delete from database
        $stmt = $this->db->prepare("DELETE FROM gallery_images WHERE id = ?");
        $stmt->execute([$imageId]);

        echo json_encode(['success' => true]);
    }
}
