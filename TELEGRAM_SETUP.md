# Telegram Integration Setup Guide

## Overview
This guide explains how to set up and troubleshoot the Telegram bot integration for ChatMe.

## Prerequisites
- A Telegram bot token from BotFather (@BotFather on Telegram)
- A publicly accessible domain with HTTPS (webhooks require SSL)
- PHP API server running and accessible from the internet

## Setup Steps

### 1. Update Environment Variables

Edit `backend/api/.env` and ensure these variables are set:

```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

**Important:** 
- Replace `your-domain.com` with your actual production domain
- The webhook URL must be HTTPS
- The path must match your actual API endpoint

### 2. Register Webhook with Telegram

Visit the following URL in your browser to register the webhook with Telegram:

```
https://your-domain.com/api/setup_telegram.php
```

You should see a JSON response confirming the webhook was set:
```json
{
    "success": true,
    "webhook_url": "https://your-domain.com/api/telegram/webhook",
    "telegram_response": {...}
}
```

### 3. Verify Webhook Setup

You can check if the webhook is properly configured by visiting:

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

Replace `YOUR_BOT_TOKEN` with your actual bot token.

## User Connection Flow

### Frontend (User Perspective)
1. User clicks "Connect Telegram" in Settings
2. App generates a connection code (valid for 10 minutes)
3. User gets a deep link: `https://t.me/ChatMeBot?start=CODE`
4. User taps link → opens Telegram
5. Telegram shows `/start CODE` command
6. User sends the message
7. App automatically polls for connection status every 2 seconds (up to 2 minutes)
8. When connected, modal closes automatically

### Backend Flow
1. User generates code via `POST /telegram/generate-code`
   - Code stored in `telegram_pending_codes` table
   - Code expires in 10 minutes

2. User sends `/start CODE` to bot
   - Telegram sends webhook to `POST /telegram/webhook`
   - Bot handler validates code
   - Creates entry in `telegram_connections` table
   - Deletes code from `telegram_pending_codes`

3. Frontend polls `GET /telegram/status`
   - Returns connection status
   - Displays success when connected

## Troubleshooting

### Issue: Bot doesn't respond to `/start`

**Check logs:**
```bash
tail -f /var/log/php-errors.log
```

Look for messages like:
- `Telegram webhook received:` - webhook is being called
- `Invalid or expired code:` - code validation failed
- `Telegram connection created:` - connection was successful

**Common causes:**
1. **Webhook URL not configured** - Update TELEGRAM_WEBHOOK_URL in .env
2. **Webhook not registered** - Run `setup_telegram.php`
3. **Domain not accessible** - Ensure domain is public and HTTPS
4. **Code expired** - Code expires after 10 minutes, regenerate a new one

### Issue: Connection status not updating automatically

The frontend automatically polls the status every 2 seconds for up to 2 minutes. If it doesn't update:
1. Check browser console for errors
2. Manually click "Check Status" button
3. Verify webhook logs show successful connection

### Issue: Can't reach `/setup_telegram.php`

The setup file is publicly accessible for admin use. Ensure:
1. Web server is running
2. Path is correct: `https://your-domain.com/api/setup_telegram.php`
3. TELEGRAM_WEBHOOK_URL and TELEGRAM_BOT_TOKEN are in .env

## Database Tables

The integration uses two main tables:

### telegram_pending_codes
Stores temporary connection codes:
- `id` - Primary key
- `user_id` - ChatMe user ID
- `code` - 32-character hex code
- `expires_at` - Expiration timestamp (10 minutes)
- `created_at` - Creation timestamp

### telegram_connections
Stores connected accounts:
- `id` - Primary key
- `user_id` - ChatMe user ID (unique)
- `telegram_user_id` - Telegram user ID
- `telegram_chat_id` - Telegram chat ID for sending messages
- `telegram_username` - Telegram username
- `notifications_enabled` - Boolean flag
- `connected_at` - Connection timestamp
- `updated_at` - Last update timestamp

## Testing

### Manual Test Flow

1. **Generate Code:**
   ```bash
   curl -X POST https://your-domain.com/api/telegram/generate-code \
     -H "Content-Type: application/json" \
     -d '{"userId": 1}'
   ```
   
   Response:
   ```json
   {
       "success": true,
       "code": "a1b2c3d4e5f6...",
       "botUsername": "ChatMeBot",
       "deepLink": "https://t.me/ChatMeBot?start=a1b2c3d4e5f6..."
   }
   ```

2. **Open Bot and Send `/start CODE`**
   - Visit the deepLink
   - Send the `/start CODE` message to the bot

3. **Check Status:**
   ```bash
   curl https://your-domain.com/api/telegram/status?userId=1
   ```
   
   Should return:
   ```json
   {
       "connected": true,
       "telegramUsername": "your_telegram_handle",
       "notificationsEnabled": true,
       "connectedAt": "2024-01-05 15:30:00"
   }
   ```

## Security Notes

1. **Code Expiration:** Codes expire after 10 minutes
2. **Code Uniqueness:** Only one code per user at a time
3. **Bot Token:** Never commit the bot token to version control
4. **Webhook Validation:** Verify HTTPS and proper domain configuration
5. **Rate Limiting:** Consider adding rate limits to code generation endpoint

## Performance

- Webhook processing: < 500ms
- Status polling interval: 2 seconds
- Maximum polling duration: 2 minutes
- Code validation: < 100ms

## Integration with Notifications

Once connected, the system can send messages to users:

```php
$telegram = new Telegram($db);
$telegram->notifyNewMessage($userId, $senderName, $messagePreview);
$telegram->notifyNewGuest($userId, $guestName);
$telegram->notifyNewComment($userId, $commenterName, $commentPreview);
```

These methods check if notifications are enabled before sending.
