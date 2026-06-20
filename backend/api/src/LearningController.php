<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class LearningController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    private function getUserId() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $m)) {
            try {
                $decoded = Auth::validateToken($m[1]);
                return $decoded->id ?? $decoded->sub ?? null;
            } catch (Exception $e) { return null; }
        }
        return null;
    }

    // GET /learning/goal
    public function getGoal() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT * FROM learning_goals WHERE user_id=:uid AND is_active=1 LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $goal = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($goal ?: (object)[]);
    }

    // POST /learning/goal
    public function setGoal() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data = json_decode(file_get_contents("php://input"), true);
        $goalType       = $data['goal_type'] ?? 'casual';
        $targetLang     = $data['target_language'] ?? 'en';
        $currentLevel   = $data['current_level'] ?? 'A1';
        $targetLevel    = $data['target_level'] ?? 'B2';
        $deadline       = $data['deadline_date'] ?? null;

        // Deactivate old goals for this language
        $this->conn->prepare("UPDATE learning_goals SET is_active=0 WHERE user_id=:uid AND target_language=:lang")
            ->execute([':uid' => $userId, ':lang' => $targetLang]);

        // Insert new goal
        $stmt = $this->conn->prepare("INSERT INTO learning_goals 
            (user_id, goal_type, target_language, current_level, target_level, deadline_date, is_active)
            VALUES (:uid, :gt, :lang, :cl, :tl, :dl, 1)");
        $stmt->execute([
            ':uid' => $userId, ':gt' => $goalType, ':lang' => $targetLang,
            ':cl' => $currentLevel, ':tl' => $targetLevel, ':dl' => $deadline
        ]);

        // Also update users table for matching
        $this->conn->prepare("UPDATE users SET language_level=:level, learning_goal=:goal WHERE id=:uid")
            ->execute([':level' => $currentLevel, ':goal' => $goalType, ':uid' => $userId]);

        // Track gamification: learning_session
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'learning_session', 1);

        echo json_encode(['success' => true, 'message' => 'Мақсади омӯзишӣ нигоҳ дошта шуд']);
    }

    // GET /learning/scenarios
    public function getScenarios() {
        $userId = $this->getUserId();
        $level  = $_GET['level'] ?? null;
        $goal   = $_GET['goal'] ?? null;
        $lang   = $_GET['language'] ?? 'en';

        $cacheKey = "scenarios_" . $lang . "_" . ($level ?? 'all') . "_" . ($goal ?? 'all');
        $cachedScenarios = Cache::get($cacheKey);
        if ($cachedScenarios !== null) {
            echo json_encode($cachedScenarios);
            return;
        }

        $where  = "WHERE is_active=1 AND language=:lang";
        $params = [':lang' => $lang];

        if ($level) { $where .= " AND level=:level"; $params[':level'] = $level; }
        if ($goal && $goal !== 'all') {
            $where .= " AND (goal_type=:goal OR goal_type='all')";
            $params[':goal'] = $goal;
        }

        $stmt = $this->conn->prepare("SELECT * FROM learning_scenarios $where ORDER BY level ASC, id ASC");
        $stmt->execute($params);
        $scenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Cache::set($cacheKey, $scenarios, 3600); // Cache for 1 hour
        echo json_encode($scenarios);
    }

    // POST /learning/scenario/start
    public function startScenario() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data       = json_decode(file_get_contents("php://input"), true);
        $scenarioId = $data['scenario_id'] ?? 0;
        $roomId     = $data['room_id'] ?? '';
        $partnerAId = $data['user_a_id'] ?? $userId;
        $partnerBId = $data['user_b_id'] ?? 0;

        if (!$scenarioId || !$roomId) {
            http_response_code(400); echo json_encode(['error'=>'Missing fields']); return;
        }

        // End any active scenario for this room
        $this->conn->prepare("UPDATE chat_scenarios SET status='abandoned', ended_at=NOW() WHERE room_id=:room AND status='active'")
            ->execute([':room' => $roomId]);

        $stmt = $this->conn->prepare("INSERT INTO chat_scenarios (room_id, scenario_id, user_a_id, user_b_id) VALUES (:r,:s,:a,:b)");
        $stmt->execute([':r'=>$roomId, ':s'=>$scenarioId, ':a'=>$partnerAId, ':b'=>$partnerBId]);
        $sessionId = $this->conn->lastInsertId();

        // Get scenario details
        $sc = $this->conn->prepare("SELECT * FROM learning_scenarios WHERE id=:id");
        $sc->execute([':id' => $scenarioId]);
        $scenario = $sc->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'session_id' => $sessionId, 'scenario' => $scenario]);
    }

    // POST /learning/scenario/complete
    public function completeScenario() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data      = json_decode(file_get_contents("php://input"), true);
        $sessionId = $data['session_id'] ?? 0;

        $this->conn->prepare("UPDATE chat_scenarios SET status='completed', ended_at=NOW() WHERE id=:id")
            ->execute([':id' => $sessionId]);

        // Track gamification
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'scenario_completed', 1);

        // Update stats
        $this->updateStats($userId, 'total_scenarios_completed', 1);

        echo json_encode(['success' => true]);
    }

    // POST /learning/correction
    public function submitCorrection() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data          = json_decode(file_get_contents("php://input"), true);
        $roomId        = $data['room_id'] ?? '';
        $msgId         = $data['message_id'] ?? '';
        $authorId      = $data['author_id'] ?? 0;
        $originalText  = $data['original_text'] ?? '';
        $correctedText = $data['corrected_text'] ?? '';
        $explanation   = $data['explanation'] ?? null;

        if (!$roomId || !$originalText || !$correctedText || !$authorId) {
            http_response_code(400); echo json_encode(['error'=>'Missing fields']); return;
        }

        // Don't let someone correct their own message
        if ((int)$userId === (int)$authorId) {
            http_response_code(400); echo json_encode(['error'=>'Cannot correct own message']); return;
        }

        $xpReward = 5; // Base XP for giving correction

        $stmt = $this->conn->prepare("INSERT INTO message_corrections 
            (original_message_id, room_id, corrector_id, author_id, original_text, corrected_text, explanation, xp_rewarded)
            VALUES (:mid, :room, :corr, :auth, :orig, :corr_text, :expl, :xp)");
        $stmt->execute([
            ':mid'       => $msgId,
            ':room'      => $roomId,
            ':corr'      => $userId,
            ':auth'      => $authorId,
            ':orig'      => $originalText,
            ':corr_text' => $correctedText,
            ':expl'      => $explanation,
            ':xp'        => $xpReward
        ]);
        $correctionId = $this->conn->lastInsertId();

        // Award XP to corrector
        $this->conn->prepare("UPDATE users SET xp=xp+:xp, corrections_given=corrections_given+1 WHERE id=:uid")
            ->execute([':xp' => $xpReward, ':uid' => $userId]);

        // Update author's received corrections count
        $this->conn->prepare("UPDATE users SET corrections_received=corrections_received+1 WHERE id=:uid")
            ->execute([':uid' => $authorId]);

        // Trust score boost for corrector
        $this->updateTrustScore($userId, 'correction_given', 2);

        // Gamification tracking
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'correction_given', 1);

        // Notify author via push
        try {
            require_once __DIR__ . '/Notification.php';
            $notification = new Notification($this->conn);
            $correctorName = $this->conn->query("SELECT name FROM users WHERE id=$userId")->fetchColumn();
            $notification->send($authorId,
                "✏️ Ислоҳ расид!",
                "$correctorName хатогии шуморо ислоҳ кард",
                ['type' => 'correction', 'correction_id' => (string)$correctionId]
            );
        } catch (Exception $e) { error_log("Correction notification error: " . $e->getMessage()); }

        echo json_encode(['success' => true, 'correction_id' => $correctionId, 'xp_earned' => $xpReward]);
    }

    // POST /learning/correction/accept
    public function acceptCorrection() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data         = json_decode(file_get_contents("php://input"), true);
        $correctionId = $data['correction_id'] ?? 0;
        $accepted     = $data['accepted'] ?? true;

        // Verify ownership
        $stmt = $this->conn->prepare("SELECT * FROM message_corrections WHERE id=:id AND author_id=:uid");
        $stmt->execute([':id' => $correctionId, ':uid' => $userId]);
        $correction = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$correction) { http_response_code(404); echo json_encode(['error'=>'Not found']); return; }

        $this->conn->prepare("UPDATE message_corrections SET was_accepted=:acc WHERE id=:id")
            ->execute([':acc' => $accepted ? 1 : 0, ':id' => $correctionId]);

        if ($accepted) {
            // Bonus XP for corrector when their correction is accepted
            $this->conn->prepare("UPDATE users SET xp=xp+3 WHERE id=:uid")
                ->execute([':uid' => $correction['corrector_id']]);

            // Gamification tracking for learner
            require_once __DIR__ . '/GamificationController.php';
            GamificationController::updateProgress($userId, 'correction_accepted', 1);

            // Update trust: corrector gets boost for useful correction
            $this->updateTrustScore($correction['corrector_id'], 'correction_accepted', 3);
        }

        echo json_encode(['success' => true]);
    }

    // GET /learning/corrections?room_id=xxx
    public function getCorrections() {
        $roomId = $_GET['room_id'] ?? '';
        if (!$roomId) { http_response_code(400); echo json_encode(['error'=>'room_id required']); return; }

        $stmt = $this->conn->prepare("SELECT mc.*, u.name as corrector_name, u.avatar as corrector_avatar
            FROM message_corrections mc
            JOIN users u ON mc.corrector_id = u.id
            WHERE mc.room_id=:room
            ORDER BY mc.created_at DESC LIMIT 50");
        $stmt->execute([':room' => $roomId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /learning/stats
    public function getStats() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        // Update streak first
        $this->updateStreak($userId);

        $stmt = $this->conn->prepare("
            SELECT COALESCE(u.streak_days, 0) as streak_days, 
                   COALESCE(u.corrections_given, 0) as corrections_given, 
                   COALESCE(u.corrections_received, 0) as corrections_received,
                   COALESCE(u.xp, 0) as xp, u.language_level, u.learning_goal,
                   FLOOR(SQRT(COALESCE(u.xp, 0) / 100)) + 1 as level,
                   COALESCE(ls.total_scenarios_completed, 0) as total_scenarios_completed, 
                   COALESCE(ls.longest_streak, 0) as longest_streak,
                   COALESCE(ls.total_corrections_made, 0) as total_corrections_made
            FROM users u
            LEFT JOIN learning_stats ls ON u.id = ls.user_id
            WHERE u.id=:uid");
        $stmt->execute([':uid' => $userId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$stats) {
            $stats = [];
        }

        // Recent corrections given
        $corrStmt = $this->conn->prepare("SELECT COUNT(*) FROM message_corrections WHERE corrector_id=:uid AND DATE(created_at)=CURDATE()");
        $corrStmt->execute([':uid' => $userId]);
        $stats['corrections_today'] = (int)$corrStmt->fetchColumn();

        // Words saved
        $wordsStmt = $this->conn->prepare("SELECT COUNT(*) FROM word_bank WHERE user_id=:uid");
        $wordsStmt->execute([':uid' => $userId]);
        $stats['words_saved'] = (int)$wordsStmt->fetchColumn();

        echo json_encode($stats ?: (object)[]);
    }

    // POST /learning/streak/update (called on daily login)
    public function updateStreakEndpoint() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }
        $streak = $this->updateStreak($userId);
        echo json_encode(['success' => true, 'streak_days' => $streak]);
    }

    // Helper: Update daily streak
    private function updateStreak($userId) {
        $stmt = $this->conn->prepare("SELECT streak_days, streak_last_date FROM users WHERE id=:uid");
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $today     = date('Y-m-d');
        $lastDate  = $row['streak_last_date'];
        $streak    = (int)$row['streak_days'];

        if ($lastDate === $today) return $streak; // Already updated today

        if ($lastDate === date('Y-m-d', strtotime('-1 day'))) {
            $streak++; // Consecutive day
        } elseif ($lastDate !== $today) {
            $streak = 1; // Reset
        }

        $this->conn->prepare("UPDATE users SET streak_days=:s, streak_last_date=:d WHERE id=:uid")
            ->execute([':s' => $streak, ':d' => $today, ':uid' => $userId]);

        // Update learning_stats longest streak
        $this->conn->prepare("INSERT INTO learning_stats (user_id, total_streak_days, longest_streak, last_active_date)
            VALUES (:uid, :s1, :s2, :d1)
            ON DUPLICATE KEY UPDATE
                total_streak_days = total_streak_days + 1,
                longest_streak = GREATEST(longest_streak, :s3),
                last_active_date = :d2")
            ->execute([':uid'=>$userId, ':s1'=>$streak, ':s2'=>$streak, ':d1'=>$today, ':s3'=>$streak, ':d2'=>$today]);

        // Gamification
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'login', 1);

        return $streak;
    }

    // Helper: Update stats counter
    private function updateStats($userId, $field, $amount = 1) {
        $allowed = ['total_messages_sent','total_corrections_made','total_corrections_received','total_scenarios_completed'];
        if (!in_array($field, $allowed)) return;
        $this->conn->prepare("INSERT INTO learning_stats (user_id, $field) VALUES (:uid, :a)
            ON DUPLICATE KEY UPDATE $field = $field + :a2")
            ->execute([':uid'=>$userId, ':a'=>$amount, ':a2'=>$amount]);
    }

    // Helper: Trust score update
    private function updateTrustScore($userId, $eventType, $delta) {
        $this->conn->prepare("UPDATE users SET trust_score = LEAST(100, GREATEST(0, trust_score + :d)) WHERE id=:uid")
            ->execute([':d' => $delta, ':uid' => $userId]);
        $this->conn->prepare("INSERT INTO trust_events (user_id, event_type, delta) VALUES (:uid,:et,:d)")
            ->execute([':uid'=>$userId, ':et'=>$eventType, ':d'=>$delta]);
    }

    // POST /learning/report-spam  (trust score decrease)
    public function reportSpam() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data       = json_decode(file_get_contents("php://input"), true);
        $reportedId = $data['reported_id'] ?? 0;
        $reason     = $data['reason'] ?? 'spam';

        if (!$reportedId) { http_response_code(400); echo json_encode(['error'=>'Missing reported_id']); return; }

        // Lower reported user's trust score
        $this->updateTrustScore($reportedId, "reported_$reason", -10);

        echo json_encode(['success' => true, 'message' => 'Гузориш қабул шуд. Ташаккур!']);
    }
}
