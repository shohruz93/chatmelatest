<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class WordBankController {
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

    // POST /wordbank/save
    public function saveWord() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data = json_decode(file_get_contents("php://input"), true);
        $word       = trim($data['word'] ?? '');
        $translation= trim($data['translation'] ?? '');
        $context    = $data['context_sentence'] ?? null;
        $sourceLang = $data['source_language'] ?? 'en';
        $targetLang = $data['target_language'] ?? 'tg';
        $roomId     = $data['room_id'] ?? null;

        if (empty($word)) { http_response_code(400); echo json_encode(['error'=>'Word required']); return; }

        // Check duplicate
        $check = $this->conn->prepare("SELECT id FROM word_bank WHERE user_id=:uid AND word=:w AND source_language=:lang LIMIT 1");
        $check->execute([':uid'=>$userId, ':w'=>$word, ':lang'=>$sourceLang]);
        if ($check->rowCount() > 0) {
            echo json_encode(['success'=>true, 'duplicate'=>true, 'message'=>'Калима аллакай дар луғати шумо аст']);
            return;
        }

        $stmt = $this->conn->prepare("INSERT INTO word_bank 
            (user_id, word, translation, context_sentence, source_language, target_language, room_id, next_review_at)
            VALUES (:uid, :w, :tr, :ctx, :sl, :tl, :room, DATE_ADD(NOW(), INTERVAL 1 DAY))");
        $stmt->execute([':uid'=>$userId, ':w'=>$word, ':tr'=>$translation, ':ctx'=>$context,
                        ':sl'=>$sourceLang, ':tl'=>$targetLang, ':room'=>$roomId]);

        // Track gamification
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'word_saved', 1);

        echo json_encode(['success'=>true, 'id'=>$this->conn->lastInsertId(), 'message'=>'Калима нигоҳ дошта шуд! 📚']);
    }

    // GET /wordbank/list
    public function listWords() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $lang   = $_GET['language'] ?? null;
        $search = $_GET['search'] ?? '';
        $page   = (int)($_GET['page'] ?? 1);
        $limit  = 20;
        $offset = ($page - 1) * $limit;

        $where = "WHERE user_id=:uid";
        $params = [':uid'=>$userId];
        if ($lang) { $where .= " AND source_language=:lang"; $params[':lang']=$lang; }
        if ($search) { $where .= " AND (word LIKE :s OR translation LIKE :s2)"; $params[':s']="%$search%"; $params[':s2']="%$search%"; }

        $stmt = $this->conn->prepare("SELECT * FROM word_bank $where ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
        $stmt->execute($params);
        $words = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $count = $this->conn->prepare("SELECT COUNT(*) FROM word_bank $where");
        $count->execute($params);
        $total = $count->fetchColumn();

        echo json_encode(['words'=>$words, 'total'=>$total, 'page'=>$page]);
    }

    // GET /wordbank/review  — words due for SRS review
    public function getReviewWords() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $limit = (int)($_GET['limit'] ?? 10);
        $stmt = $this->conn->prepare("SELECT * FROM word_bank 
            WHERE user_id=:uid AND is_mastered=0 AND next_review_at <= NOW()
            ORDER BY next_review_at ASC LIMIT :lim");
        $stmt->bindValue(':uid', $userId);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /wordbank/review-result  — SRS algorithm
    public function submitReviewResult() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data    = json_decode(file_get_contents("php://input"), true);
        $wordId  = $data['word_id'] ?? 0;
        $correct = $data['correct'] ?? false;

        // Verify ownership
        $stmt = $this->conn->prepare("SELECT * FROM word_bank WHERE id=:id AND user_id=:uid");
        $stmt->execute([':id'=>$wordId, ':uid'=>$userId]);
        $word = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$word) { http_response_code(404); echo json_encode(['error'=>'Not found']); return; }

        $level = (int)$word['srs_level'];
        // SRS intervals (days): 1, 2, 4, 7, 14, 30, 90
        $intervals = [1, 2, 4, 7, 14, 30, 90];

        if ($correct) {
            $level = min($level + 1, 6);
        } else {
            $level = max($level - 1, 0);
        }

        $nextDays = $intervals[$level];
        $isMastered = ($level >= 6) ? 1 : 0;

        $this->conn->prepare("UPDATE word_bank SET 
            srs_level=:lv, times_reviewed=times_reviewed+1,
            times_correct = times_correct + :c,
            next_review_at = DATE_ADD(NOW(), INTERVAL :days DAY),
            is_mastered=:m
            WHERE id=:id")
            ->execute([':lv'=>$level, ':c'=>$correct?1:0, ':days'=>$nextDays, ':m'=>$isMastered, ':id'=>$wordId]);

        // Track gamification
        if ($correct) {
            require_once __DIR__ . '/GamificationController.php';
            GamificationController::updateProgress($userId, 'word_reviewed', 1);
        }

        echo json_encode(['success'=>true, 'next_review_in_days'=>$nextDays, 'srs_level'=>$level, 'is_mastered'=>$isMastered]);
    }

    // DELETE /wordbank/word
    public function deleteWord() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $wordId = $_GET['id'] ?? 0;
        $this->conn->prepare("DELETE FROM word_bank WHERE id=:id AND user_id=:uid")
            ->execute([':id'=>$wordId, ':uid'=>$userId]);
        echo json_encode(['success'=>true]);
    }

    // GET /wordbank/stats
    public function getStats() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT
            COUNT(*) as total_words,
            SUM(is_mastered) as mastered,
            SUM(CASE WHEN next_review_at <= NOW() AND is_mastered=0 THEN 1 ELSE 0 END) as due_review,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as saved_today
            FROM word_bank WHERE user_id=:uid");
        $stmt->execute([':uid'=>$userId]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    }
}
