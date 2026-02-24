<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/src/Database.php';

$response = [
    'success' => false,
    'logs' => [],
    'updated_count' => 0
];

try {
    $database = new Database();
    $db = $database->getConnection();

    // Add unique_id column if it doesn't exist
    $query = "SHOW COLUMNS FROM users LIKE 'unique_id'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $exists = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$exists) {
        $response['logs'][] = "Adding unique_id column to users table...";
        $db->exec("ALTER TABLE users ADD COLUMN unique_id VARCHAR(16) UNIQUE NULL AFTER id");
        $response['logs'][] = "Column added successfully.";
    } else {
        $response['logs'][] = "unique_id column already exists.";
    }

    // Generate unique_ids for users that don't have one
    $response['logs'][] = "Finding users without a unique_id...";
    $query = "SELECT id FROM users WHERE unique_id IS NULL OR unique_id = ''";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $response['logs'][] = "Found " . count($users) . " users to update.";

    $count = 0;
    if (count($users) > 0) {
        $updateQuery = "UPDATE users SET unique_id = :unique_id WHERE id = :id";
        $updateStmt = $db->prepare($updateQuery);

        foreach ($users as $user) {
            $uniqueId = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 10);
            
            // Ensure truly unique ID in loop
            $uniquePass = false;
            while (!$uniquePass) {
                try {
                    $checkQuery = "SELECT id FROM users WHERE unique_id = :unique_id";
                    $checkStmt = $db->prepare($checkQuery);
                    $checkStmt->execute([':unique_id' => $uniqueId]);
                    if ($checkStmt->rowCount() == 0) {
                        $uniquePass = true;
                    } else {
                        $uniqueId = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 10);
                    }
                } catch(Exception $e) {
                    // ignore
                }
            }

            try {
                $updateStmt->execute([
                    ':unique_id' => $uniqueId,
                    ':id' => $user['id']
                ]);
                $count++;
            } catch (PDOException $e) {
                $response['logs'][] = "Error updating user " . $user['id'] . ": " . $e->getMessage();
            }
        }
        $response['logs'][] = "Successfully updated $count users with new unique_ids.";
    }
    
    $response['updated_count'] = $count;
    $response['success'] = true;
    echo json_encode($response);

} catch (PDOException $e) {
    $response['success'] = false;
    $response['logs'][] = "Database Error: " . $e->getMessage();
    $response['error'] = $e->getMessage();
    http_response_code(500);
    echo json_encode($response);
}
