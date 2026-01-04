<?php
require_once __DIR__ . '/db_connection.php'; // Adjust path as needed
require_once __DIR__ . '/TelegramWebhook.php';

$database = new Database();
$db = $database->getConnection();
$telegramWebhook = new TelegramWebhook($db);

// Check current status
echo "Current Webhook Status:\n";
$status = $telegramWebhook->getWebhookStatus();
print_r($status);

// Set webhook if needed
// REPLACE THIS URL with your actual public HTTPS URL for the webhook
$webhookUrl = 'https://shphbjeio23.chatme.tj/telegram/webhook'; 

if (isset($argv[1]) && $argv[1] === 'set') {
    echo "\nSetting webhook to: $webhookUrl\n";
    $result = $telegramWebhook->setWebhook($webhookUrl);
    print_r($result);
} else {
    echo "\nTo set the webhook, run: php check_webhook.php set\n";
}
