<?php
require_once __DIR__ . '/Profile.php';
require_once __DIR__ . '/Notification.php';
require_once __DIR__ . '/User.php';

class VoiceController {
    private $db;
    private $profile;
    private $notification;
    private $user;

    public function __construct($db) {
        $this->db = $db;
        $this->profile = new Profile($db);
        $this->notification = new Notification($db);
        $this->user = new User($db);
    }

    public function notifyFollowers() {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);

        $hostId = $data['hostId'] ?? null;
        $roomId = $data['roomId'] ?? null;
        $topic = $data['topic'] ?? 'New Voice Room';

        if (!$hostId || !$roomId) {
            http_response_code(400);
            echo json_encode(['error' => 'hostId and roomId are required']);
            return;
        }

        // Get host name
        $hostName = $this->user->getNameById($hostId);
        
        // Get follower IDs
        $followerIds = $this->profile->getFollowerIds($hostId);

        if (empty($followerIds)) {
            echo json_encode(['success' => true, 'notifiedCount' => 0]);
            return;
        }

        // Send notifications
        $title = "Live Voice Room";
        $body = ($hostName ?: "Someone you follow") . " started a live room: " . $topic;
        $payload = [
            'type' => 'voice_room',
            'roomId' => $roomId,
            'hostId' => $hostId,
            'topic' => $topic
        ];

        $this->notification->sendToMultiple($followerIds, $title, $body, $payload);

        echo json_encode(['success' => true, 'notifiedCount' => count($followerIds)]);
    }
}
