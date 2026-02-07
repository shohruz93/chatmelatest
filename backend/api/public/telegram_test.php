<?php
// backend/api/public/telegram_test.php

// Prevent caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Load configuration
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
} else {
    // If not found, try to manually set or check for parent directory env
    $envFile = __DIR__ . '/../../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
                list($key, $value) = explode('=', $line, 2);
    putenv(trim($key) . '=' . trim($value));
            }
        }
    }
}

$botToken = getenv('TELEGRAM_BOT_TOKEN');
$webhookUrl = getenv('TELEGRAM_WEBHOOK_URL');
$logFile = __DIR__ . '/telegram_debug.log';

// Helper to send request to Telegram API
function callTelegram($method, $data = [], $token) {
    if (!$token) return ['ok' => false, 'description' => 'No token'];
    
    $url = "https://api.telegram.org/bot$token/$method";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    if (!empty($data)) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    }
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true);
}

// 1. Handle Incoming Webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $update = json_decode($input, true);

    // Log the raw input
    $logEntry = "[" . date('Y-m-d H:i:s') . "] RECEIVED:\n" . $input . "\n" . str_repeat('-', 20) . "\n\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);

    // If it's a message, reply!
    if (isset($update['message'])) {
        $chatId = $update['message']['chat']['id'];
        $text = $update['message']['text'] ?? '(no text)';
        $user = $update['message']['from']['first_name'] ?? 'Unknown';

        // Echo back for confirmation
        callTelegram('sendMessage', [
            'chat_id' => $chatId,
            'text' => "✅ DEBUG: Received your message: \"$text\""
        ], $botToken);
    }

    echo "OK";
    exit;
}

// 2. Helper to determine current URL
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$currentScriptUrl = "$protocol://$_SERVER[HTTP_HOST]$_SERVER[PHP_SELF]";
$mode = $_GET['mode'] ?? 'view';

// 3. Handle Actions
$message = "";
if ($mode === 'set_webhook' && $botToken) {
    // Set webhook to THIS script
    $res = callTelegram('setWebhook', ['url' => $currentScriptUrl], $botToken);
    $message = "Webhook Set Result: " . json_encode($res);
} elseif ($mode === 'restore_webhook' && $webhookUrl && $botToken) {
    // Restore original webhook
    $res = callTelegram('setWebhook', ['url' => $webhookUrl], $botToken);
    $message = "Webhook Restore Result: " . json_encode($res);
} elseif ($mode === 'clear_logs') {
    file_put_contents($logFile, "");
    $message = "Logs cleared.";
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Telegram Debugger</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
        .box { border: 1px solid #ccc; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; }
        .btn { display: inline-block; padding: 10px 15px; text-decoration: none; color: white; border-radius: 4px; margin-right: 10px; margin-bottom: 5px;}
        .blue { background: #007bff; }
        .green { background: #28a745; }
        .red { background: #dc3545; }
        .gray { background: #6c757d; }
        pre { background: #f8f9fa; padding: 1rem; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🤖 Telegram Debugger</h1>
    
    <?php if ($message): ?>
        <div class="box" style="background:#e8f5e9; border-color:#81c784;">
            <strong>Result:</strong> <?php echo $message; ?>
        </div>
    <?php endif; ?>

    <div class="box">
        <h2>1. Status</h2>
        <p><strong>Bot Token:</strong> <?php echo $botToken ? "Found ✅" : "Missing ❌"; ?></p>
        <p><strong>Current Script URL:</strong> <?php echo $currentScriptUrl; ?></p>

        <?php
        if ($botToken) {
            $info = callTelegram('getWebhookInfo', [], $botToken);
            $currentWebhook = $info['result']['url'] ?? 'Unknown';
            echo "<p><strong>Active Webhook URL:</strong> $currentWebhook</p>";
            
            if ($currentWebhook == $currentScriptUrl) {
                echo "<p style='color:green; font-weight:bold;'>✅ The bot is currently pointing to THIS script.</p>";
            } else {
                echo "<p style='color:orange; font-weight:bold;'>⚠️ The bot is NOT pointing to this script.</p>";
            }
            
            if (!empty($info['result']['last_error_message'])) {
                echo "<p style='color:red;'><strong>Last Telegram Error:</strong> " . $info['result']['last_error_message'] . "</p>";
            }
        }
        ?>
    </div>

    <div class="box">
        <h2>2. Actions</h2>
        <a href="?mode=set_webhook" class="btn blue">🔗 Link Bot to THIS Script</a>
        <a href="?mode=restore_webhook" class="btn gray">↩️ Restore Original Webhook</a>
        <a href="?mode=clear_logs" class="btn red">🗑️ Clear Logs</a>
        <a href="?" class="btn green">🔄 Refresh Page</a>
    </div>

    <div class="box">
        <h2>3. Incoming Requests</h2>
        <p><em>Send a message to your bot on Telegram. It should appear below.</em></p>
        <?php
        if (file_exists($logFile)) {
            echo "<pre>" . (htmlspecialchars(file_get_contents($logFile)) ?: "No logs yet...") . "</pre>";
        } else {
            echo "<p>No log file created yet.</p>";
        }
        ?>
    </div>
</body>
</html>
