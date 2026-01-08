<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../src/Router.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Profile.php';
require_once __DIR__ . '/../src/MatchController.php';
require_once __DIR__ . '/../src/AdvancedMatchController.php';
require_once __DIR__ . '/../src/Friendship.php';
require_once __DIR__ . '/../src/Message.php';
require_once __DIR__ . '/../src/Conversation.php';
require_once __DIR__ . '/../src/AdminController.php';
require_once __DIR__ . '/../src/Push.php';
require_once __DIR__ . '/../src/AppVersion.php';
require_once __DIR__ . '/../src/Telegram.php';
require_once __DIR__ . '/../src/TelegramWebhook.php';
require_once __DIR__ . '/../src/GamificationController.php';
require_once __DIR__ . '/../src/GameController.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit();
}

$router = new Router();
$auth = new Auth($db);
$profile = new Profile($db);
$matchController = new MatchController($db);
$advancedMatch = new AdvancedMatchController($db);
$friendship = new Friendship($db);
$message = new Message($db);
$conversation = new Conversation($db);
$adminController = new AdminController($db);
$push = new Push($db);
$appVersion = new AppVersion($db);
$telegram = new Telegram($db);
$telegramWebhook = new TelegramWebhook($db);
$gamificationController = new GamificationController();
$gameController = new GameController();

// Auth Routes
$router->add('POST', '/auth/google', function() use ($auth) {
    $auth->login();
});

$router->add('POST', '/auth/send-code', function() use ($auth) {
    $auth->sendCode();
});

$router->add('POST', '/auth/verify-code', function() use ($auth) {
    $auth->verifyCode();
});

// Push Notification Routes
$router->add('POST', '/push/subscribe', function() use ($push) {
    $push->subscribe();
});

$router->add('POST', '/push/unsubscribe', function() use ($push) {
    $push->unsubscribe();
});

// Telegram Routes
$router->add('POST', '/telegram/generate-code', function() use ($telegram) {
    $telegram->generateConnectionCode();
});

$router->add('POST', '/telegram/verify-connect', function() use ($telegram) {
    $telegram->verifyAndConnect();
});

$router->add('GET', '/telegram/status', function() use ($telegram) {
    $telegram->getStatus();
});

$router->add('POST', '/telegram/disconnect', function() use ($telegram) {
    $telegram->disconnect();
});

$router->add('POST', '/telegram/toggle-notifications', function() use ($telegram) {
    $telegram->toggleNotifications();
});

$router->add('POST', '/telegram/webhook', function() use ($telegramWebhook) {
    $telegramWebhook->handleUpdate();
});

// Profile Routes
$router->add('GET', '/profile', function() use ($profile) {
    $userId = $_GET['userId'] ?? 1; 
    $profile->get($userId);
});

$router->add('POST', '/profile', function() use ($profile) {
    $userId = $_GET['userId'] ?? 1;
    $profile->update($userId);
});

$router->add('POST', '/profile/rating', function() use ($profile) {
    $profile->addRating();
});

$router->add('POST', '/profile/comment', function() use ($profile) {
    $profile->addComment();
});

$router->add('POST', '/profile/view', function() use ($profile) {
    $data = json_decode(file_get_contents("php://input"), true);
    $viewerId = $data['viewerId'] ?? 0;
    $viewedId = $data['viewedId'] ?? 0;
    $profile->recordView($viewerId, $viewedId);
});

$router->add('GET', '/profile/guests', function() use ($profile) {
    $userId = $_GET['userId'] ?? 0;
    $profile->getGuests($userId);
});

$router->add('GET', '/profile/guests/new', function() use ($profile) {
    $userId = $_GET['userId'] ?? 0;
    $profile->getNewGuestsCount($userId);
});

$router->add('POST', '/profile/guests/seen', function() use ($profile) {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $data['userId'] ?? 0;
    $profile->markGuestsAsSeen($userId);
});

$router->add('GET', '/profile/comments', function() use ($profile) {
    $userId = $_GET['userId'] ?? 0;
    $profile->getComments($userId);
});

$router->add('POST', '/profile/comment/reply', function() use ($profile) {
    $profile->addReply();
});

$router->add('POST', '/profile/comment/like', function() use ($profile) {
    $profile->likeComment();
});

// Gamification Routes
$router->add('GET', '/gamification/missions', function() use ($gamificationController) {
    $gamificationController->getMissions();
});

$router->add('POST', '/gamification/claim', function() use ($gamificationController) {
    $gamificationController->claimMission();
});

$router->add('POST', '/gamification/track', function() use ($gamificationController) {
    $gamificationController->trackProgress();
});

// Game Routes
$router->add('POST', '/games/bet', function() use ($gameController) {
    $gameController->bet();
});

$router->add('POST', '/games/win', function() use ($gameController) {
    $gameController->win();
});

// Match Routes
$router->add('GET', '/match', function() use ($matchController) {
    $userId = $_GET['userId'] ?? 1;
    $matchController->findMatch($userId);
});

// Friend Routes
$router->add('POST', '/friend/request', function() use ($friendship) {
    $userId = $_GET['userId'] ?? 1; // Sender
    $friendship->sendRequest($userId);
});

$router->add('POST', '/friend/accept', function() use ($friendship) {
    $userId = $_GET['userId'] ?? 1; // Acceptor
    $friendship->acceptRequest($userId);
});

$router->add('GET', '/friends', function() use ($friendship) {
    $userId = $_GET['userId'] ?? 1;
    $friendship->getFriends($userId);
});

// Message Routes
$router->add('GET', '/messages', function() use ($message) {
    $userId = $_GET['userId'] ?? 1;
    $otherUserId = $_GET['otherUserId'] ?? 0;
    $message->getHistory($userId, $otherUserId);
});

$router->add('GET', '/messages/room', function() use ($message) {
    $roomId = $_GET['roomId'] ?? '';
    $limit = $_GET['limit'] ?? 50;
    $offset = $_GET['offset'] ?? 0;
    $message->getByRoom($roomId, $limit, $offset);
});

$router->add('POST', '/messages', function() use ($message) {
    $message->save();
});

$router->add('PUT', '/messages', function() use ($message) {
    $message->update();
});

$router->add('DELETE', '/messages', function() use ($message) {
    $message->delete();
});

// Conversation Routes
$router->add('GET', '/conversations', function() use ($conversation) {
    $userId = $_GET['userId'] ?? 1;
    $conversation->getList($userId);
});

$router->add('POST', '/conversations/read', function() use ($conversation) {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $data['userId'] ?? 0;
    $otherUserId = $data['otherUserId'] ?? 0;
    $conversation->markAsRead($userId, $otherUserId);
});

// Random Users for Matching
$router->add('GET', '/users/random', function() use ($db) {
    $currentUserId = $_GET['userId'] ?? 0;
    $gender = $_GET['gender'] ?? 'any';
    $location = $_GET['location'] ?? 'any';
    $limit = $_GET['limit'] ?? 10;
    $onlineIdsParam = $_GET['online_ids'] ?? '';
    
    require_once __DIR__ . '/../src/User.php';
    $user = new User($db);
    
    $filters = [
        'gender' => $gender,
        'location' => $location
    ];
    
    $includeIds = [];
    if (!empty($onlineIdsParam)) {
        $includeIds = explode(',', $onlineIdsParam);
    }
    
    $users = $user->getRandomUsers($currentUserId, $filters, $limit, $includeIds);
    echo json_encode($users);
});

$router->add('GET', '/users/smart-match', function() use ($db) {
    require_once __DIR__ . '/../src/User.php';
    $user = new User($db);
    $currentUserId = $_GET['userId'] ?? 0;
    // Collect optional filters from query params
    $filters = [
        'gender' => $_GET['gender'] ?? 'any',
        'location' => $_GET['location'] ?? 'any',
        'native' => $_GET['native'] ?? '',
        'learning' => $_GET['learning'] ?? '',
        'online_ids' => $_GET['online_ids'] ?? ''
    ];

    $match = $user->getSmartMatch($currentUserId, $filters);
    echo json_encode($match);
});

// Advanced Matching Routes
$router->add('GET', '/match/compatible', function() use ($advancedMatch) {
    $userId = $_GET['userId'] ?? 0;
    $filters = [
        'preferred_gender' => $_GET['gender'] ?? 'any',
        'preferred_location' => $_GET['location'] ?? 'any',
        'online_only' => isset($_GET['onlineOnly']) ? filter_var($_GET['onlineOnly'], FILTER_VALIDATE_BOOLEAN) : false
    ];
    $limit = $_GET['limit'] ?? 10;
    
    $matches = $advancedMatch->findCompatibleUsers($userId, $filters, $limit);
    echo json_encode($matches);
});

$router->add('GET', '/match/preferences', function() use ($advancedMatch) {
    $userId = $_GET['userId'] ?? 0;
    $preferences = $advancedMatch->getUserPreferences($userId);
    echo json_encode($preferences);
});

$router->add('POST', '/match/preferences', function() use ($advancedMatch) {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $data['userId'] ?? 0;
    $preferences = $data['preferences'] ?? [];
    
    $result = $advancedMatch->updatePreferences($userId, $preferences);
    echo json_encode(['success' => $result]);
});

$router->add('POST', '/match/history', function() use ($advancedMatch) {
    $data = json_decode(file_get_contents("php://input"), true);
    $user1Id = $data['user1Id'] ?? 0;
    $user2Id = $data['user2Id'] ?? 0;
    $score = $data['compatibilityScore'] ?? 0;
    $reasons = $data['matchReasons'] ?? [];
    
    $matchId = $advancedMatch->recordMatch($user1Id, $user2Id, $score, $reasons);
    echo json_encode(['success' => true, 'matchId' => $matchId]);
});

$router->add('POST', '/match/feedback', function() use ($advancedMatch) {
    $data = json_decode(file_get_contents("php://input"), true);
    $matchId = $data['matchId'] ?? 0;
    $raterId = $data['raterId'] ?? 0;
    $ratedId = $data['ratedId'] ?? 0;
    $rating = $data['rating'] ?? 0;
    $feedback = $data['feedback'] ?? '';
    
    $result = $advancedMatch->submitFeedback($matchId, $raterId, $ratedId, $rating, $feedback);
    echo json_encode(['success' => $result]);
});

// Admin Routes
$router->add('GET', '/admin/stats', function() use ($adminController) {
    $adminController->getStats();
});

$router->add('GET', '/admin/users', function() use ($adminController) {
    $adminController->getUsers();
});

$router->add('POST', '/admin/users/ban', function() use ($adminController) {
    $adminController->banUser();
});

$router->add('POST', '/admin/users/unban', function() use ($adminController) {
    $adminController->unbanUser();
});

$router->add('POST', '/admin/users/toggle-admin', function() use ($adminController) {
    $adminController->toggleAdmin();
});

$router->add('GET', '/admin/users/details', function() use ($adminController) {
    $adminController->getUserDetails();
});

$router->add('POST', '/admin/support/conversations', function() use ($adminController) {
    $adminController->getSupportConversations();
});

$router->add('POST', '/admin/apps/upload', function() use ($adminController) {
    // Ideally check admin auth here, but assuming it's done via middleware or in controller if specific
    $adminController->uploadApp();
});

$router->add('GET', '/admin/apps', function() use ($adminController) {
    $adminController->getAppVersions();
});

// App Version Check (Public)
$router->add('GET', '/app/version', function() use ($appVersion) {
    $platform = $_GET['platform'] ?? '';
    // $currentVersion = $_GET['current_version'] ?? '';
    
    if (empty($platform)) {
        http_response_code(400);
        echo json_encode(['error' => 'Platform required (android/ios)']);
        return;
    }
    
    $latest = $appVersion->getLatestVersion($platform);
    
    if ($latest) {
        echo json_encode(['update_available' => true, 'latest_version' => $latest]);
    } else {
        echo json_encode(['update_available' => false, 'message' => 'No versions found']);
    }
});

$router->add('GET', '/app/download', function() use ($db) {
    require_once __DIR__ . '/../src/AppController.php';
    $appController = new AppController($db);
    $appController->download();
});

$router->add('GET', '/support/admin-contact', function() use ($db) {
    // Quick inline logic or move to controller
    $query = "SELECT id, name, avatar FROM users WHERE is_admin = 1 LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($admin) {
        echo json_encode($admin);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'No admin available']);
    }
});

// Heartbeat - Update user's last_active timestamp
$router->add('POST', '/heartbeat', function() use ($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $data['userId'] ?? 0;
    
    if ($userId) {
        require_once __DIR__ . '/../src/User.php';
        $user = new User($db);
        $user->updateLastActive($userId);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'User ID required']);
    }
});

// Test Route
$router->add('GET', '/', function() {
    echo json_encode(["message" => "Welcome to Chatme API"]);
});

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
