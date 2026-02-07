<?php
// Simple script to verify bot token and check production webhook status

// Load .env
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

$botToken = getenv('TELEGRAM_BOT_TOKEN');
$webhookUrl = getenv('TELEGRAM_WEBHOOK_URL');

function callTelegram($method, $token) {
    $url = "https://api.telegram.org/bot$token/$method";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true);
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Telegram Bot Verification</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
        .box { border: 1px solid #ddd; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; }
        .ok { background: #d4edda; border-color: #c3e6cb; }
        .err { background: #f8d7da; border-color: #f5c6cb; }
        .info { background: #d1ecf1; border-color: #bee5eb; }
        pre { background: #f8f9fa; padding: 1rem; overflow-x: auto; }
        h3 { margin-top: 0; }
    </style>
</head>
<body>
    <h1>🤖 Telegram Bot Verification</h1>

    <?php if (!$botToken): ?>
        <div class="box err">
            <h3>❌ No Bot Token</h3>
            <p>TELEGRAM_BOT_TOKEN not found in .env file</p>
        </div>
    <?php else: ?>
        
        <div class="box ok">
            <h3>✅ Bot Token Found</h3>
            <p>Token: <?php echo substr($botToken, 0, 15); ?>...</p>
        </div>

        <?php
        // Get bot info
        $botInfo = callTelegram('getMe', $botToken);
        if ($botInfo['ok'] ?? false): ?>
            <div class="box ok">
                <h3>✅ Bot Connection Successful</h3>
                <p><strong>Bot Username:</strong> @<?php echo $botInfo['result']['username']; ?></p>
                <p><strong>Bot Name:</strong> <?php echo $botInfo['result']['first_name']; ?></p>
                <p><strong>Bot ID:</strong> <?php echo $botInfo['result']['id']; ?></p>
            </div>
        <?php else: ?>
            <div class="box err">
                <h3>❌ Failed to Connect to Bot</h3>
                <pre><?php echo json_encode($botInfo, JSON_PRETTY_PRINT); ?></pre>
            </div>
        <?php endif; ?>

        <?php
        // Get webhook info
        $webhookInfo = callTelegram('getWebhookInfo', $botToken);
        if ($webhookInfo['ok'] ?? false): 
            $currentUrl = $webhookInfo['result']['url'] ?? '';
        ?>
            <div class="box <?php echo $currentUrl ? 'ok' : 'err'; ?>">
                <h3><?php echo $currentUrl ? '✅' : '⚠️'; ?> Webhook Status</h3>
                
                <?php if ($currentUrl): ?>
                    <p><strong>Current Webhook:</strong> <?php echo htmlspecialchars($currentUrl); ?></p>
                    
                    <?php if ($currentUrl === $webhookUrl): ?>
                        <p style="color: green;">✅ Matches .env configuration</p>
                    <?php else: ?>
                        <p style="color: orange;">⚠️ Different from .env: <?php echo htmlspecialchars($webhookUrl); ?></p>
                    <?php endif; ?>

                    <p><strong>Pending Updates:</strong> <?php echo $webhookInfo['result']['pending_update_count'] ?? 0; ?></p>
                    
                    <?php if (!empty($webhookInfo['result']['last_error_message'])): ?>
                        <p style="color: red;"><strong>Last Error:</strong> <?php echo htmlspecialchars($webhookInfo['result']['last_error_message']); ?></p>
                        <p><strong>Error Date:</strong> <?php echo date('Y-m-d H:i:s', $webhookInfo['result']['last_error_date']); ?></p>
                    <?php else: ?>
                        <p style="color: green;">✅ No recent errors</p>
                    <?php endif; ?>

                <?php else: ?>
                    <p>⚠️ No webhook is currently set</p>
                    <p><em>Run setup_telegram.php on production to set webhook</em></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="box info">
            <h3>📋 Testing Instructions</h3>
            <p><strong>To test the bot connection:</strong></p>
            <ol>
                <li>Open Telegram and search for <strong>@<?php echo $botInfo['result']['username'] ?? 'ChatMeBot'; ?></strong></li>
                <li>Send the command: <code>/start</code></li>
                <li>The bot should respond (if webhook is working on production)</li>
            </ol>
            
            <p><strong>To test the full integration:</strong></p>
            <ol>
                <li>Open your ChatMe app</li>
                <li>Go to Profile → Edit → Connect Telegram</li>
                <li>The link should open <strong>@<?php echo $botInfo['result']['username'] ?? 'ChatMeBot'; ?></strong></li>
                <li>Send the /start command with the code</li>
                <li>The app should detect connection within 2 seconds</li>
            </ol>

            <p><em>Note: Webhooks must be HTTPS and publicly accessible. Local testing with localhost won't work for webhooks.</em></p>
        </div>

    <?php endif; ?>

</body>
</html>
