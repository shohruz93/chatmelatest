# Unix Timestamps Implementation Guide

This document explains how the ChatMe application now uses Unix timestamps (in seconds) for all date/time fields to properly handle user timezones.

## Overview

**Unix Timestamp** is the number of seconds that have elapsed since January 1, 1970, 00:00:00 UTC. This is a timezone-independent way to store timestamps.

Instead of storing MySQL TIMESTAMP fields that are converted to the server's timezone, we now store Unix timestamps as integers (INT type). This allows each client to convert the timestamp to their local timezone.

## Database Schema Changes

### Changed Columns

The following columns have been converted from MySQL TIMESTAMP to INT (Unix timestamp in seconds):

**users table:**
- `created_at` - Unix timestamp when user registered
- `last_active` - Unix timestamp of last activity (already stored as INT via UNIX_TIMESTAMP())

**messages table:**
- `created_at` - Unix timestamp when message was sent

**friendships table:**
- `created_at` - Unix timestamp when friendship was created

**profile_views table:**
- `viewed_at` - Unix timestamp of profile visit

**user_ratings table:**
- `created_at` - Unix timestamp of rating

**comment_replies table:**
- `created_at` - Unix timestamp of reply

**comment_likes table:**
- `created_at` - Unix timestamp of like/dislike

**match_history table:**
- `created_at` - Unix timestamp when match was created
- `ended_at` - Unix timestamp when match ended

**match_feedback table:**
- `created_at` - Unix timestamp when feedback was submitted

**user_preferences table:**
- `updated_at` - Unix timestamp of last update

**user_activity table:**
- `created_at` - Unix timestamp of activity

## Migration Steps

### Step 1: Backup Your Database
```bash
mysqldump -u root -p chatme > backup_before_unix_migration.sql
```

### Step 2: Run Migration Script
```bash
# Run the migration script to add new INT columns
mysql -u root -p chatme < database/migrate_to_unix_timestamps.sql
```

This script:
1. Adds new `*_unix` columns to all relevant tables
2. Converts existing TIMESTAMP data to Unix timestamps
3. Maintains backward compatibility

### Step 3: Test and Verify
```sql
-- Verify migration was successful
SELECT id, created_at_unix, unix_to_datetime(created_at_unix) as readable_date 
FROM users LIMIT 1;
```

### Step 4: Deploy Code Changes
Deploy the updated PHP API, Node.js Socket server, and Angular frontend.

### Step 5: Finalize (Optional)
```bash
# After verifying everything works correctly, run finalization script
mysql -u root -p chatme < database/finalize_unix_timestamps.sql
```

This script:
1. Renames `*_unix` columns to replace old TIMESTAMP columns
2. Creates triggers for automatic timestamp generation on INSERT
3. Creates helper functions for timestamp conversion

## Backend Implementation

### PHP API (PHP)

#### TimestampHelper Class
The `TimestampHelper` class provides utility methods for timestamp conversion:

```php
// Convert PHP TIMESTAMP string to Unix timestamp
$unix = TimestampHelper::toUnix('2024-01-15 14:30:00'); // Returns: 1705334400

// Get current time as Unix timestamp
$now = TimestampHelper::now(); // Returns: current Unix timestamp

// Convert array of rows
TimestampHelper::convertRowsToUnix($messages, ['created_at']);
```

#### Usage in Controllers

```php
// In Profile.php
$guests = $stmt->fetchAll(PDO::FETCH_ASSOC);
TimestampHelper::convertRowsToUnix($guests, ['viewed_at']);
echo json_encode($guests); // Returns Unix timestamps
```

### Node.js Socket Server

The Socket server should use Unix timestamps in seconds:

```javascript
// Always use Math.floor(Date.now() / 1000) for Unix timestamp in seconds
const timestamp = Math.floor(Date.now() / 1000);

io.emit('user_status_changed', {
    userId: userId,
    status: 'online',
    timestamp: timestamp // Unix timestamp in seconds
});
```

## Frontend Implementation

### Angular Timestamp Service

The `TimestampService` provides methods to work with Unix timestamps:

```typescript
import { TimestampService } from './services/timestamp.service';

constructor(private timestampService: TimestampService) {}

// Convert Unix timestamp to Date
const date = this.timestampService.unixToDate(1705334400);

// Get current time as Unix timestamp
const now = this.timestampService.now();

// Format for display
const formatted = this.timestampService.formatDate(1705334400);

// Relative time (e.g., "2 hours ago")
const relative = this.timestampService.formatRelativeTime(1705334400);

// Check if within hours
const isRecent = this.timestampService.isWithinHours(timestamp, 24);
```

### Angular Pipe

The `UnixDatePipe` formats Unix timestamps in templates:

```html
<!-- Format as relative time (e.g., "2 hours ago") -->
<p>{{ message.created_at | unixDate:'relative' }}</p>

<!-- Format as short date/time -->
<p>{{ message.created_at | unixDate:'short' }}</p>

<!-- Format as full date/time -->
<p>{{ message.created_at | unixDate:'full' }}</p>

<!-- Format as time only -->
<p>{{ message.created_at | unixDate:'time' }}</p>

<!-- Format as date only -->
<p>{{ message.created_at | unixDate:'date' }}</p>
```

## API Response Format

All API responses now include Unix timestamps (in seconds):

### Example: Get Message History
```json
{
  "messages": [
    {
      "id": 1,
      "sender_id": 5,
      "receiver_id": 10,
      "content": "Hello!",
      "created_at": 1705334400,
      "type": "text"
    },
    {
      "id": 2,
      "sender_id": 10,
      "receiver_id": 5,
      "content": "Hi there!",
      "created_at": 1705334500,
      "type": "text"
    }
  ]
}
```

### Example: Get Guests
```json
{
  "guests": [
    {
      "id": 15,
      "name": "John",
      "avatar": "/uploads/avatar.png",
      "viewed_at": 1705334400
    }
  ]
}
```

## Socket.IO Events

Socket events now include Unix timestamps:

```javascript
// user_status_changed event
{
  userId: 5,
  status: 'online',
  timestamp: 1705334400  // Unix timestamp in seconds
}

// Offline event
{
  userId: 5,
  status: 'offline',
  lastSeen: 1705334400   // Unix timestamp in seconds
}
```

## Timezone Handling

Each client automatically converts Unix timestamps to their local timezone:

### Browser (JavaScript)
```javascript
const unixTimestamp = 1705334400;
const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
console.log(date.toLocaleString()); // Shows local timezone
```

### Angular Service
```typescript
// Automatically handles timezone conversion
const date = this.timestampService.unixToDate(1705334400);
// Returns Date object in user's local timezone
```

## Best Practices

1. **Always store as Unix timestamp in seconds (not milliseconds)**
   ```php
   // ✓ Correct
   $timestamp = time(); // Returns seconds
   
   // ✗ Wrong
   $timestamp = time() * 1000; // Converts to milliseconds
   ```

2. **Convert on read from database**
   ```php
   // ✓ Correct - Convert when returning to client
   TimestampHelper::convertRowsToUnix($data, ['created_at']);
   
   // ✗ Wrong - Leaving as TIMESTAMP string
   echo json_encode($data);
   ```

3. **Convert on write to database**
   ```php
   // ✓ Correct - PHP automatically converts with UNIX_TIMESTAMP()
   $query = "INSERT INTO messages SET created_at = UNIX_TIMESTAMP()";
   
   // Node.js should do the same
   const query = "INSERT INTO messages SET created_at = UNIX_TIMESTAMP()";
   ```

4. **Use TimestampService in Angular for all operations**
   ```typescript
   // ✓ Correct
   const relative = this.timestampService.formatRelativeTime(timestamp);
   
   // ✗ Wrong
   const diff = Date.now() - timestamp;
   ```

5. **Always use pipes in templates**
   ```html
   <!-- ✓ Correct -->
   <p>{{ message.created_at | unixDate:'relative' }}</p>
   
   <!-- ✗ Wrong -->
   <p>{{ message.created_at | date }}</p>
   ```

## Common Conversions

### PHP Examples
```php
// Current Unix timestamp
$now = time();

// Convert to readable date
echo date('Y-m-d H:i:s', 1705334400); // 2024-01-15 14:30:00

// Store in database
$query = "INSERT INTO messages (created_at) VALUES (UNIX_TIMESTAMP())";

// Retrieve from database
$timestamp = $row['created_at']; // Already Unix timestamp
$date = new DateTime('@' . $timestamp);
echo $date->format('Y-m-d H:i:s');
```

### JavaScript Examples
```javascript
// Current Unix timestamp
const now = Math.floor(Date.now() / 1000);

// Convert to Date object
const date = new Date(1705334400 * 1000);

// Format relative time
const diffSeconds = now - timestamp;
if (diffSeconds < 60) {
    console.log('just now');
} else if (diffSeconds < 3600) {
    console.log(Math.floor(diffSeconds / 60) + ' minutes ago');
}
```

### MySQL Examples
```sql
-- Get Unix timestamp
SELECT UNIX_TIMESTAMP();

-- Convert Unix timestamp to readable date
SELECT FROM_UNIXTIME(1705334400);

-- Find messages from last 24 hours
SELECT * FROM messages 
WHERE created_at > UNIX_TIMESTAMP() - 86400;

-- Group by date (without time)
SELECT DATE(FROM_UNIXTIME(created_at)), COUNT(*) 
FROM messages 
GROUP BY DATE(FROM_UNIXTIME(created_at));
```

## Troubleshooting

### Issue: Timestamps are showing incorrect values
**Solution:** Ensure you're converting to milliseconds when creating Date objects in JavaScript:
```javascript
const date = new Date(unixTimestamp * 1000); // Multiply by 1000!
```

### Issue: Database shows wrong timestamps after migration
**Solution:** Verify that the data was converted correctly:
```sql
SELECT created_at, FROM_UNIXTIME(created_at) as readable_date 
FROM users LIMIT 5;
```

### Issue: API returns null timestamps
**Solution:** Check that TimestampHelper is being called:
```php
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);
TimestampHelper::convertRowsToUnix($data, ['created_at']);
echo json_encode($data);
```

## Performance Considerations

- **Comparison:** Unix timestamps are faster to compare (direct integer comparison)
- **Storage:** INT (4 bytes) is smaller than TIMESTAMP (4 bytes in MySQL) but more efficient
- **Calculations:** Math operations on Unix timestamps are fast (simple integer arithmetic)
- **Indexing:** INT columns can be indexed efficiently

## Future Enhancements

1. **Caching:** Cache formatted timestamps on the client to reduce re-renders
2. **Localization:** Use user's preferred locale for date formatting
3. **Relative Time Updates:** Implement websocket-based updates for "time ago" strings
4. **Time Zone Selection:** Allow users to set their preferred timezone in settings

## References

- [Unix Time - Wikipedia](https://en.wikipedia.org/wiki/Unix_time)
- [JavaScript Date - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MySQL Date Functions](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html)
- [Angular Date Pipe](https://angular.io/api/common/DatePipe)
