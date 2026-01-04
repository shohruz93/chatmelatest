<?php
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/TelegramWebhook.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $db = $database->getConnection();
    $telegram = new TelegramWebhook($db);

    // The webhook URL should point to your production endpoint
    $webhookUrl = 'https://shphbjeio23.chatme.tj/telegram/webhook';
    
    // Set the webhook
    $result = $telegram->setWebhook($webhookUrl);
    
    echo json_encode([
        'success' => true,
        'webhook_url' => $webhookUrl,
        'telegram_response' => $result
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
