<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

class ContentController {
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

    // ─── SLANG OF THE WEEK ────────────────────────────────────

    // GET /content/slang
    public function getSlangOfWeek() {
        $userId = $this->getUserId();
        $lang   = $_GET['language'] ?? 'en';
        $weekNum = (int)date('W');
        $year    = (int)date('Y');

        $stmt = $this->conn->prepare("SELECT s.*, 
            CASE WHEN ss.user_id IS NOT NULL THEN 1 ELSE 0 END as already_seen,
            CASE WHEN ss.saved_to_bank=1 THEN 1 ELSE 0 END as saved_to_bank
            FROM slang_of_week s
            LEFT JOIN slang_seen ss ON ss.slang_id=s.id AND ss.user_id=:uid
            WHERE s.language=:lang AND s.week_number=:w AND s.year=:y AND s.is_active=1
            LIMIT 1");
        $stmt->execute([':uid'=>$userId??0, ':lang'=>$lang, ':w'=>$weekNum, ':y'=>$year]);
        $slang = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$slang) {
            // Fallback: last available slang
            $fb = $this->conn->prepare("SELECT * FROM slang_of_week WHERE language=:lang AND is_active=1 ORDER BY year DESC, week_number DESC LIMIT 1");
            $fb->execute([':lang'=>$lang]);
            $slang = $fb->fetch(PDO::FETCH_ASSOC);
        }

        // Mark as seen
        if ($userId && $slang) {
            $this->conn->prepare("INSERT IGNORE INTO slang_seen (user_id, slang_id) VALUES (:uid, :sid)")
                ->execute([':uid'=>$userId, ':sid'=>$slang['id']]);

            // Gamification
            require_once __DIR__ . '/GamificationController.php';
            GamificationController::updateProgress($userId, 'slang_viewed', 1);
        }

        echo json_encode($slang ?: (object)[]);
    }

    // POST /content/slang/save-to-bank
    public function saveSlangToBank() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data   = json_decode(file_get_contents("php://input"), true);
        $slangId = $data['slang_id'] ?? 0;

        $stmt = $this->conn->prepare("SELECT * FROM slang_of_week WHERE id=:id");
        $stmt->execute([':id'=>$slangId]);
        $slang = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$slang) { http_response_code(404); echo json_encode(['error'=>'Not found']); return; }

        // Save to word bank
        $wb = $this->conn->prepare("INSERT IGNORE INTO word_bank 
            (user_id, word, translation, context_sentence, source_language, target_language)
            VALUES (:uid, :w, :tr, :ctx, :lang, 'tg')");
        $wb->execute([
            ':uid'=>$userId,
            ':w'=>$slang['phrase'],
            ':tr'=>$slang['meaning'],
            ':ctx'=>$slang['example_sentence'],
            ':lang'=>$slang['language']
        ]);

        $this->conn->prepare("UPDATE slang_seen SET saved_to_bank=1 WHERE user_id=:uid AND slang_id=:sid")
            ->execute([':uid'=>$userId, ':sid'=>$slangId]);

        echo json_encode(['success'=>true, 'message'=>'Сленг ба луғати шумо илова шуд! 📚']);
    }

    // ─── CHALLENGE CARDS ─────────────────────────────────────

    // POST /content/challenge/send
    public function sendChallenge() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data       = json_decode(file_get_contents("php://input"), true);
        $receiverId = $data['receiver_id'] ?? 0;
        $roomId     = $data['room_id'] ?? '';
        $title      = $data['title'] ?? '';
        $description= $data['description'] ?? '';
        $type       = $data['challenge_type'] ?? 'write';
        $lang       = $data['target_language'] ?? 'en';
        $hours      = (int)($data['deadline_hours'] ?? 24);
        $xpReward   = (int)($data['xp_reward'] ?? 20);

        if (!$receiverId || !$title || !$roomId) {
            http_response_code(400); echo json_encode(['error'=>'Missing required fields']); return;
        }

        $stmt = $this->conn->prepare("INSERT INTO challenge_cards 
            (sender_id, receiver_id, room_id, title, description, challenge_type, target_language, deadline_hours, xp_reward)
            VALUES (:sid, :rid, :room, :title, :desc, :type, :lang, :hrs, :xp)");
        $stmt->execute([':sid'=>$userId,':rid'=>$receiverId,':room'=>$roomId,
                        ':title'=>$title,':desc'=>$description,':type'=>$type,
                        ':lang'=>$lang,':hrs'=>$hours,':xp'=>$xpReward]);
        $cardId = $this->conn->lastInsertId();

        // Notify receiver
        try {
            require_once __DIR__ . '/Notification.php';
            $senderName = $this->conn->query("SELECT name FROM users WHERE id=$userId")->fetchColumn();
            $notification = new Notification($this->conn);
            $notification->send($receiverId,
                "🎯 Чолиши нав!",
                "$senderName шуморо ба чолиш даъват кард: $title",
                ['type'=>'challenge','card_id'=>(string)$cardId,'room_id'=>$roomId]
            );
        } catch (Exception $e) { error_log("Challenge notify: ".$e->getMessage()); }

        echo json_encode(['success'=>true, 'card_id'=>$cardId]);
    }

    // POST /content/challenge/respond
    public function respondToChallenge() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data       = json_decode(file_get_contents("php://input"), true);
        $cardId     = $data['card_id'] ?? 0;
        $responseText = $data['response_text'] ?? '';
        $audioUrl   = $data['audio_url'] ?? null;

        $stmt = $this->conn->prepare("SELECT * FROM challenge_cards WHERE id=:id AND receiver_id=:uid AND status='pending'");
        $stmt->execute([':id'=>$cardId, ':uid'=>$userId]);
        $card = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$card) { http_response_code(404); echo json_encode(['error'=>'Challenge not found']); return; }

        // Check deadline
        $created = strtotime($card['created_at']);
        $deadline = $created + ($card['deadline_hours'] * 3600);
        if (time() > $deadline) {
            $this->conn->prepare("UPDATE challenge_cards SET status='expired' WHERE id=:id")->execute([':id'=>$cardId]);
            http_response_code(400); echo json_encode(['error'=>'Challenge has expired']); return;
        }

        $this->conn->prepare("UPDATE challenge_cards SET status='completed', response_text=:rt, response_audio_url=:au, completed_at=NOW() WHERE id=:id")
            ->execute([':rt'=>$responseText, ':au'=>$audioUrl, ':id'=>$cardId]);

        // Award XP
        $xp = $card['xp_reward'];
        $this->conn->prepare("UPDATE users SET xp=xp+:xp WHERE id=:uid")->execute([':xp'=>$xp, ':uid'=>$userId]);

        // Gamification
        require_once __DIR__ . '/GamificationController.php';
        GamificationController::updateProgress($userId, 'challenge_completed', 1);

        // Notify sender
        try {
            require_once __DIR__ . '/Notification.php';
            $myName = $this->conn->query("SELECT name FROM users WHERE id=$userId")->fetchColumn();
            $notification = new Notification($this->conn);
            $notification->send($card['sender_id'],
                "✅ Чолиш иҷро шуд!",
                "$myName чолиши '$card[title]'-ро иҷро кард",
                ['type'=>'challenge_done','card_id'=>(string)$cardId]
            );
        } catch (Exception $e) {}

        echo json_encode(['success'=>true, 'xp_earned'=>$xp, 'message'=>"Чолиш иҷро шуд! +$xp XP"]);
    }

    // GET /content/challenge/my
    public function getMyChallenges() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT cc.*, 
            us.name as sender_name, us.avatar as sender_avatar,
            ur.name as receiver_name, ur.avatar as receiver_avatar
            FROM challenge_cards cc
            JOIN users us ON us.id=cc.sender_id
            JOIN users ur ON ur.id=cc.receiver_id
            WHERE cc.receiver_id=:uid OR cc.sender_id=:uid2
            ORDER BY cc.created_at DESC LIMIT 30");
        $stmt->execute([':uid'=>$userId, ':uid2'=>$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ─── AVAILABILITY SCHEDULE ────────────────────────────────

    // POST /content/availability
    public function setAvailability() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $data = json_decode(file_get_contents("php://input"), true);
        $tz   = $data['timezone'] ?? 'UTC';
        $days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        $cols = array_map(fn($d) => "$d\_hours", $days);

        $params = [':uid'=>$userId, ':tz'=>$tz, ':async'=>$data['prefer_async']??0];
        $sets = ["timezone=:tz", "prefer_async=:async"];
        foreach ($days as $day) {
            $key = ":$day";
            $params[$key] = isset($data["{$day}_hours"]) ? json_encode($data["{$day}_hours"]) : null;
            $sets[] = "{$day}_hours=$key";
        }
        $setStr = implode(',', $sets);

        $this->conn->prepare("INSERT INTO user_availability (user_id, timezone, prefer_async, " . implode(',', array_map(fn($d)=>"{$d}_hours", $days)) . ")
            VALUES (:uid, :tz, :async, :monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday)
            ON DUPLICATE KEY UPDATE $setStr")
            ->execute($params);

        // Also update users table
        $this->conn->prepare("UPDATE users SET timezone=:tz, prefer_async=:async WHERE id=:uid")
            ->execute([':tz'=>$tz, ':async'=>$data['prefer_async']??0, ':uid'=>$userId]);

        echo json_encode(['success'=>true]);
    }

    // GET /content/availability
    public function getAvailability() {
        $userId = $this->getUserId();
        if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Unauthorized']); return; }

        $stmt = $this->conn->prepare("SELECT * FROM user_availability WHERE user_id=:uid");
        $stmt->execute([':uid'=>$userId]);
        $avail = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($avail) {
            $days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
            foreach ($days as $day) {
                if (!empty($avail["{$day}_hours"])) {
                    $avail["{$day}_hours"] = json_decode($avail["{$day}_hours"], true);
                }
            }
        }
        echo json_encode($avail ?: (object)[]);
    }
}
