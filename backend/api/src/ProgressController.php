<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class ProgressController {
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

    // GET /progress/weekly  — current week stats
    public function getWeeklyReport() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $weekNum = (int)date('W');
        $year    = (int)date('Y');

        // Generate report if not exists
        $this->generateWeeklySnapshot($userId, $weekNum, $year);

        $stmt = $this->conn->prepare("SELECT * FROM weekly_progress WHERE user_id=:uid AND week_number=:w AND year=:y");
        $stmt->execute([':uid'=>$userId, ':w'=>$weekNum, ':y'=>$year]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);

        // Add previous week for comparison
        $prevWeek = $weekNum > 1 ? $weekNum - 1 : 52;
        $prevYear = $weekNum > 1 ? $year : $year - 1;
        $prevStmt = $this->conn->prepare("SELECT * FROM weekly_progress WHERE user_id=:uid AND week_number=:w AND year=:y");
        $prevStmt->execute([':uid'=>$userId, ':w'=>$prevWeek, ':y'=>$prevYear]);
        $prevReport = $prevStmt->fetch(PDO::FETCH_ASSOC);

        // Compute fluency score
        $fluency = $this->computeFluencyScore($userId);

        echo json_encode([
            'current_week' => $report ?: $this->emptyReport($userId, $weekNum, $year),
            'previous_week'=> $prevReport ?: null,
            'fluency_score'=> $fluency,
            'week_number'  => $weekNum
        ]);
    }

    // GET /progress/fluency
    public function getFluencyScore() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }
        $score = $this->computeFluencyScore($userId);
        echo json_encode(['fluency_score'=>$score, 'breakdown'=>$this->getFluencyBreakdown($userId)]);
    }

    // POST /progress/snapshot  — generate snapshot for current week
    public function generateSnapshot() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }
        $weekNum = (int)date('W');
        $year    = (int)date('Y');
        $this->generateWeeklySnapshot($userId, $weekNum, $year);
        echo json_encode(['success'=>true]);
    }

    // GET /progress/history — last 12 weeks
    public function getHistory() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }
        $stmt = $this->conn->prepare("SELECT * FROM weekly_progress WHERE user_id=:uid ORDER BY year DESC, week_number DESC LIMIT 12");
        $stmt->execute([':uid'=>$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // Helper: Generate weekly snapshot
    private function generateWeeklySnapshot($userId, $weekNum, $year) {
        $weekStart = new DateTime();
        $weekStart->setISODate($year, $weekNum);
        $weekEnd = clone $weekStart;
        $weekEnd->modify('+7 days');
        $startStr = $weekStart->format('Y-m-d');
        $endStr   = $weekEnd->format('Y-m-d');

        // Gather stats
        $messages = $this->conn->prepare("SELECT COUNT(*) FROM messages WHERE sender_id=:uid AND created_at BETWEEN :s AND :e");
        $messages->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $msgCount = (int)$messages->fetchColumn();

        $corr = $this->conn->prepare("SELECT COUNT(*) FROM message_corrections WHERE corrector_id=:uid AND created_at BETWEEN :s AND :e");
        $corr->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $corrGiven = (int)$corr->fetchColumn();

        $corrRcv = $this->conn->prepare("SELECT COUNT(*) FROM message_corrections WHERE author_id=:uid AND created_at BETWEEN :s AND :e");
        $corrRcv->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $corrReceived = (int)$corrRcv->fetchColumn();

        $scen = $this->conn->prepare("SELECT COUNT(*) FROM chat_scenarios WHERE (user_a_id=:uid OR user_b_id=:uid2) AND status='completed' AND started_at BETWEEN :s AND :e");
        $scen->execute([':uid'=>$userId, ':uid2'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $scenCount = (int)$scen->fetchColumn();

        $words = $this->conn->prepare("SELECT COUNT(*) FROM word_bank WHERE user_id=:uid AND created_at BETWEEN :s AND :e");
        $words->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $wordsSaved = (int)$words->fetchColumn();

        $wordsRev = $this->conn->prepare("SELECT SUM(times_reviewed) FROM word_bank WHERE user_id=:uid AND updated_at BETWEEN :s AND :e");
        $wordsRev->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $wordsReviewed = (int)$wordsRev->fetchColumn();

        $buddy = $this->conn->prepare("SELECT COUNT(*) FROM buddy_sessions bs 
            JOIN study_buddies sb ON bs.buddy_id=sb.id 
            WHERE bs.user_id=:uid AND bs.created_at BETWEEN :s AND :e");
        $buddy->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $buddySessions = (int)$buddy->fetchColumn();

        $xpStmt = $this->conn->prepare("SELECT SUM(xp_amount) FROM xp_log WHERE user_id=:uid AND created_at BETWEEN :s AND :e");
        $xpStmt->execute([':uid'=>$userId, ':s'=>$startStr, ':e'=>$endStr]);
        $xpEarned = (int)$xpStmt->fetchColumn();

        $streak = $this->conn->query("SELECT streak_days FROM users WHERE id=$userId")->fetchColumn();

        // Upsert
        $this->conn->prepare("INSERT INTO weekly_progress 
            (user_id, week_number, year, messages_sent, corrections_given, corrections_received,
             scenarios_completed, words_saved, words_reviewed, buddy_sessions, xp_earned, streak_days)
            VALUES (:uid,:w,:y,:msg,:cg,:cr,:sc,:ws,:wr,:bs,:xp,:str)
            ON DUPLICATE KEY UPDATE
                messages_sent=:msg2, corrections_given=:cg2, corrections_received=:cr2,
                scenarios_completed=:sc2, words_saved=:ws2, words_reviewed=:wr2,
                buddy_sessions=:bs2, xp_earned=:xp2, streak_days=:str2")
            ->execute([
                ':uid'=>$userId, ':w'=>$weekNum, ':y'=>$year,
                ':msg'=>$msgCount, ':msg2'=>$msgCount,
                ':cg'=>$corrGiven, ':cg2'=>$corrGiven,
                ':cr'=>$corrReceived, ':cr2'=>$corrReceived,
                ':sc'=>$scenCount, ':sc2'=>$scenCount,
                ':ws'=>$wordsSaved, ':ws2'=>$wordsSaved,
                ':wr'=>$wordsReviewed, ':wr2'=>$wordsReviewed,
                ':bs'=>$buddySessions, ':bs2'=>$buddySessions,
                ':xp'=>$xpEarned, ':xp2'=>$xpEarned,
                ':str'=>$streak, ':str2'=>$streak
            ]);
    }

    // Helper: Compute overall fluency score (0-100)
    private function computeFluencyScore($userId) {
        $stmt = $this->conn->prepare("SELECT u.xp, u.corrections_given, u.streak_days, u.language_level,
            ls.total_scenarios_completed, ls.total_corrections_made,
            (SELECT COUNT(*) FROM word_bank WHERE user_id=u.id AND is_mastered=1) as mastered_words
            FROM users u
            LEFT JOIN learning_stats ls ON u.id=ls.user_id
            WHERE u.id=:uid");
        $stmt->execute([':uid'=>$userId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$data) return 0;

        // Scoring components (each max 20 points)
        $levelMap = ['A1'=>5,'A2'=>10,'B1'=>15,'B2'=>20,'C1'=>25,'C2'=>30];
        $levelScore = min(20, ($levelMap[$data['language_level']] ?? 5));
        $xpScore    = min(20, floor($data['xp'] / 500));
        $corrScore  = min(20, floor($data['corrections_given'] / 5));
        $scenScore  = min(20, floor(($data['total_scenarios_completed'] ?? 0) / 2));
        $vocabScore = min(20, floor(($data['mastered_words'] ?? 0) / 10));

        $total = $levelScore + $xpScore + $corrScore + $scenScore + $vocabScore;

        // Update in DB
        $this->conn->prepare("UPDATE users SET fluency_score=:s WHERE id=:uid")->execute([':s'=>$total, ':uid'=>$userId]);
        return $total;
    }

    private function getFluencyBreakdown($userId) {
        return [
            'language_level' => ['label'=>'CEFR Сатҳ', 'max'=>20],
            'xp'             => ['label'=>'Таҷриба (XP)', 'max'=>20],
            'corrections'    => ['label'=>'Ислоҳҳо дода', 'max'=>20],
            'scenarios'      => ['label'=>'Сенарияҳо', 'max'=>20],
            'vocabulary'     => ['label'=>'Луғати ёддошт', 'max'=>20]
        ];
    }

    private function emptyReport($userId, $week, $year) {
        return ['user_id'=>$userId,'week_number'=>$week,'year'=>$year,
                'messages_sent'=>0,'corrections_given'=>0,'corrections_received'=>0,
                'scenarios_completed'=>0,'words_saved'=>0,'words_reviewed'=>0,
                'buddy_sessions'=>0,'xp_earned'=>0,'streak_days'=>0];
    }
}
