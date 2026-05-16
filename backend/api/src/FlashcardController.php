<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class FlashcardController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    private function getUserId() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $m)) {
            try { $d = Auth::validateToken($m[1]); return $d->id ?? $d->sub ?? null; }
            catch (Exception $e) { return null; }
        }
        return null;
    }

    // GET /flashcards
    public function list() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT id, front, back, interval_days as `interval`, repetition, efactor, next_review_at as nextReview FROM flashcards WHERE user_id=:uid ORDER BY created_at DESC");
        $stmt->execute([':uid'=>$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /flashcards
    public function save() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data = json_decode(file_get_contents("php://input"), true);
        $id         = $data['id'] ?? null;
        $front      = $data['front'] ?? '';
        $back       = $data['back'] ?? '';
        $interval   = $data['interval'] ?? 0;
        $repetition = $data['repetition'] ?? 0;
        $efactor    = $data['efactor'] ?? 2.5;
        $nextReview = $data['nextReview'] ?? (time() * 1000);

        if (!$id || empty($front) || empty($back)) {
            http_response_code(400); echo json_encode(['error'=>'Missing fields']); return;
        }

        $stmt = $this->conn->prepare("INSERT INTO flashcards 
            (id, user_id, front, back, interval_days, repetition, efactor, next_review_at)
            VALUES (:id, :uid, :f, :b, :i, :r, :e, :n)
            ON DUPLICATE KEY UPDATE 
            front=:f2, back=:b2, interval_days=:i2, repetition=:r2, efactor=:e2, next_review_at=:n2");
        
        $stmt->execute([
            ':id'=>$id, ':uid'=>$userId, ':f'=>$front, ':b'=>$back, ':i'=>$interval, ':r'=>$repetition, ':e'=>$efactor, ':n'=>$nextReview,
            ':f2'=>$front, ':b2'=>$back, ':i2'=>$interval, ':r2'=>$repetition, ':e2'=>$efactor, ':n2'=>$nextReview
        ]);

        echo json_encode(['success'=>true]);
    }

    // DELETE /flashcards
    public function delete() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $id = $_GET['id'] ?? '';
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID required']); return; }

        $stmt = $this->conn->prepare("DELETE FROM flashcards WHERE id=:id AND user_id=:uid");
        $stmt->execute([':id'=>$id, ':uid'=>$userId]);
        echo json_encode(['success'=>true]);
    }
}
