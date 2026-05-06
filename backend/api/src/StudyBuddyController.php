<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class StudyBuddyController {
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

    // POST /buddy/request
    public function sendRequest() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data = json_decode(file_get_contents("php://input"), true);
        $partnerId   = $data['partner_id'] ?? 0;
        $langPair    = $data['language_pair'] ?? 'en-tg';
        $weeklyGoal  = $data['weekly_goal_minutes'] ?? 60;

        if (!$partnerId || $partnerId == $userId) {
            http_response_code(400); echo json_encode(['error'=>'Invalid partner']); return;
        }

        // Check if already exists
        $check = $this->conn->prepare("SELECT id, status FROM study_buddies 
            WHERE (requester_id=:u AND partner_id=:p) OR (requester_id=:p2 AND partner_id=:u2)");
        $check->execute([':u'=>$userId,':p'=>$partnerId,':p2'=>$partnerId,':u2'=>$userId]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            echo json_encode(['success'=>false, 'message'=>'Шумо аллакай бо ин корбар шарикед', 'status'=>$existing['status']]);
            return;
        }

        // Get levels
        $lvStmt = $this->conn->prepare("SELECT language_level FROM users WHERE id=:id");
        $lvStmt->execute([':id'=>$userId]);
        $myLevel = $lvStmt->fetchColumn();
        $lvStmt->execute([':id'=>$partnerId]);
        $partnerLevel = $lvStmt->fetchColumn();

        $stmt = $this->conn->prepare("INSERT INTO study_buddies 
            (requester_id, partner_id, language_pair, requester_level, partner_level, weekly_goal_minutes, status)
            VALUES (:uid, :pid, :lp, :rl, :pl, :wg, 'pending')");
        $stmt->execute([':uid'=>$userId, ':pid'=>$partnerId, ':lp'=>$langPair,
                        ':rl'=>$myLevel, ':pl'=>$partnerLevel, ':wg'=>$weeklyGoal]);
        $buddyId = $this->conn->lastInsertId();

        // Notify partner
        try {
            require_once __DIR__ . '/Notification.php';
            $myName = $this->conn->query("SELECT name FROM users WHERE id=$userId")->fetchColumn();
            $notification = new Notification($this->conn);
            $notification->send($partnerId,
                "🤝 Даъвати шарики омӯзишӣ!",
                "$myName мехоҳад шарики омӯзишии шумо шавад",
                ['type'=>'buddy_request','buddy_id'=>(string)$buddyId]
            );
        } catch (Exception $e) { error_log("Buddy notify error: ".$e->getMessage()); }

        echo json_encode(['success'=>true, 'buddy_id'=>$buddyId, 'message'=>'Даъват фиристода шуд! 🤝']);
    }

    // POST /buddy/accept
    public function acceptRequest() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data    = json_decode(file_get_contents("php://input"), true);
        $buddyId = $data['buddy_id'] ?? 0;
        $accept  = $data['accept'] ?? true;

        $stmt = $this->conn->prepare("SELECT * FROM study_buddies WHERE id=:id AND partner_id=:uid AND status='pending'");
        $stmt->execute([':id'=>$buddyId, ':uid'=>$userId]);
        $buddy = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$buddy) { http_response_code(404); echo json_encode(['error'=>'Request not found']); return; }

        $newStatus = $accept ? 'active' : 'ended';
        $this->conn->prepare("UPDATE study_buddies SET status=:s, week_start_at=NOW() WHERE id=:id")
            ->execute([':s'=>$newStatus, ':id'=>$buddyId]);

        if ($accept) {
            // Notify requester
            try {
                require_once __DIR__ . '/Notification.php';
                $myName = $this->conn->query("SELECT name FROM users WHERE id=$userId")->fetchColumn();
                $notification = new Notification($this->conn);
                $notification->send($buddy['requester_id'],
                    "🎉 Шарикии омӯзишӣ фаъол шуд!",
                    "$myName даъватро қабул кард. Омӯзиш оғоз мешавад!",
                    ['type'=>'buddy_accepted','buddy_id'=>(string)$buddyId]
                );
            } catch (Exception $e) {}
        }

        echo json_encode(['success'=>true, 'status'=>$newStatus]);
    }

    // GET /buddy/my
    public function getMyBuddies() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("
            SELECT sb.*,
                CASE WHEN sb.requester_id=:uid THEN sb.partner_id ELSE sb.requester_id END as buddy_user_id,
                CASE WHEN sb.requester_id=:uid2 THEN sb.requester_minutes_this_week ELSE sb.partner_minutes_this_week END as my_minutes,
                CASE WHEN sb.requester_id=:uid3 THEN sb.partner_minutes_this_week ELSE sb.requester_minutes_this_week END as partner_minutes,
                u.name as buddy_name, u.avatar as buddy_avatar, u.language_level as buddy_level,
                u.is_vip as buddy_is_vip
            FROM study_buddies sb
            JOIN users u ON u.id = CASE WHEN sb.requester_id=:uid4 THEN sb.partner_id ELSE sb.requester_id END
            WHERE (sb.requester_id=:uid5 OR sb.partner_id=:uid6) AND sb.status IN ('pending','active','paused')
            ORDER BY sb.started_at DESC");
        $stmt->execute([':uid'=>$userId,':uid2'=>$userId,':uid3'=>$userId,':uid4'=>$userId,':uid5'=>$userId,':uid6'=>$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /buddy/checkin — log a practice session
    public function checkIn() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data     = json_decode(file_get_contents("php://input"), true);
        $buddyId  = $data['buddy_id'] ?? 0;
        $minutes  = max(1, (int)($data['duration_minutes'] ?? 5));
        $type     = $data['session_type'] ?? 'chat';

        $stmt = $this->conn->prepare("SELECT * FROM study_buddies WHERE id=:id AND (requester_id=:u OR partner_id=:u2) AND status='active'");
        $stmt->execute([':id'=>$buddyId,':u'=>$userId,':u2'=>$userId]);
        $buddy = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$buddy) { http_response_code(404); echo json_encode(['error'=>'Buddy not found']); return; }

        // Log session
        $this->conn->prepare("INSERT INTO buddy_sessions (buddy_id, user_id, duration_minutes, session_type) VALUES (:bid,:uid,:min,:type)")
            ->execute([':bid'=>$buddyId,':uid'=>$userId,':min'=>$minutes,':type'=>$type]);

        // Update minutes this week
        $field = ($buddy['requester_id'] == $userId) ? 'requester_minutes_this_week' : 'partner_minutes_this_week';
        $this->conn->prepare("UPDATE study_buddies SET $field = $field + :m, last_checkin_at=NOW(), total_sessions=total_sessions+1 WHERE id=:id")
            ->execute([':m'=>$minutes,':id'=>$buddyId]);

        // Check if weekly goal reached — both partners
        $updated = $this->conn->prepare("SELECT requester_minutes_this_week, partner_minutes_this_week, weekly_goal_minutes FROM study_buddies WHERE id=:id");
        $updated->execute([':id'=>$buddyId]);
        $row = $updated->fetch(PDO::FETCH_ASSOC);
        $bothDone = ($row['requester_minutes_this_week'] >= $row['weekly_goal_minutes']
                  && $row['partner_minutes_this_week'] >= $row['weekly_goal_minutes']);
        if ($bothDone) {
            $this->conn->prepare("UPDATE study_buddies SET streak_weeks=streak_weeks+1 WHERE id=:id")->execute([':id'=>$buddyId]);
        }

        // Gamification
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'buddy_session', 1);

        // Update buddy_score
        $this->conn->prepare("UPDATE users SET buddy_score=LEAST(100, buddy_score+2) WHERE id=:uid")->execute([':uid'=>$userId]);

        echo json_encode(['success'=>true, 'minutes_logged'=>$minutes, 'both_goal_met'=>$bothDone]);
    }

    // GET /buddy/pending — incoming requests
    public function getPendingRequests() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT sb.*, u.name as requester_name, u.avatar as requester_avatar, u.language_level
            FROM study_buddies sb
            JOIN users u ON u.id = sb.requester_id
            WHERE sb.partner_id=:uid AND sb.status='pending'");
        $stmt->execute([':uid'=>$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /buddy/weekly-reset — cron job endpoint
    public function weeklyReset() {
        // Reset weekly minutes every Monday (called by cron)
        $this->conn->exec("UPDATE study_buddies SET 
            requester_minutes_this_week=0, 
            partner_minutes_this_week=0,
            week_start_at=NOW()
            WHERE status='active'");
        echo json_encode(['success'=>true, 'message'=>'Weekly reset done']);
    }
}
