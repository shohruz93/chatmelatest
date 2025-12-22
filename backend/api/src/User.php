<?php

class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $google_id;
    public $email;
    public $name;
    public $avatar;
    public $bio;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createOrUpdate($googleUser) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE google_id = :google_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":google_id", $googleUser['sub']);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            // User exists: Return ID without updating personal info
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            return $this->id;
        } else {
            // Create new user
            $query = "INSERT INTO " . $this->table_name . " 
                    SET google_id=:google_id, email=:email, name='New User', 
                        first_name=:first_name, family_name=:family_name, avatar=:avatar";
            
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(":google_id", $googleUser['sub']);
            $stmt->bindParam(":email", $googleUser['email']);
            $stmt->bindParam(":first_name", $googleUser['given_name']);
            $stmt->bindParam(":family_name", $googleUser['family_name']);
            $stmt->bindParam(":avatar", $googleUser['picture']);

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                
                // Update name to "User {id}"
                $updateNameQuery = "UPDATE " . $this->table_name . " SET name = :name WHERE id = :id";
                $updateNameStmt = $this->conn->prepare($updateNameQuery);
                $newName = "User " . $this->id;
                $updateNameStmt->bindParam(":name", $newName);
                $updateNameStmt->bindParam(":id", $this->id);
                $updateNameStmt->execute();

                return $this->id;
            }
        }
        return false;
    }

    public function getProfile($id) {
        $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, native_language, learning_language FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getRandomUsers($currentUserId, $filters = [], $limit = 10, $includeIds = []) {
        $query = "SELECT id, name, email, avatar, gender, location, bio, native_language, learning_language FROM " . $this->table_name . " WHERE id != :current_user_id";
        
        $params = [':current_user_id' => $currentUserId];
        
        // Apply gender filter
        if (!empty($filters['gender']) && $filters['gender'] !== 'any') {
            $query .= " AND gender = :gender";
            $params[':gender'] = $filters['gender'];
        }
        
        // Apply location filter
        if (!empty($filters['location']) && $filters['location'] !== 'any') {
            $query .= " AND location = :location";
            $params[':location'] = $filters['location'];
        }

        // Apply include_ids filter (for online users)
        if (!empty($includeIds)) {
            // Create placeholders for the IN clause
            $placeholders = [];
            foreach ($includeIds as $i => $id) {
                $key = ":include_id_$i";
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $query .= " AND id IN (" . implode(',', $placeholders) . ")";
        }
        
        $query .= " ORDER BY RAND() LIMIT :limit";
        
        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch interests for each user
        foreach ($users as &$user) {
            $query = "SELECT i.id, i.name FROM interests i 
                      JOIN user_interests ui ON i.id = ui.interest_id 
                      WHERE ui.user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":user_id", $user['id']);
            $stmt->execute();
            $user['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $users;
    }

    public function getSmartMatch($currentUserId) {
        // 1. Get current user's interests
        $query = "SELECT interest_id FROM user_interests WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $currentUserId);
        $stmt->execute();
        $myInterests = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($myInterests)) {
            // No interests? Just return a random user
            return $this->getRandomUsers($currentUserId, [], 1)[0] ?? null;
        }

        // 2. Find other users with overlapping interests
        $inQuery = implode(',', array_fill(0, count($myInterests), '?'));
        
        $sql = "
            SELECT u.id, u.name, u.avatar, u.gender, u.location, u.bio, u.native_language, u.learning_language,
                   COUNT(ui.interest_id) as shared_count
            FROM users u
            JOIN user_interests ui ON u.id = ui.user_id
            WHERE u.id != ? 
            AND ui.interest_id IN ($inQuery)
            GROUP BY u.id
            ORDER BY shared_count DESC, RAND()
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($sql);
        
        // Bind parameters: currentUserId first, then the interest IDs
        $params = array_merge([$currentUserId], $myInterests);
        $stmt->execute($params);
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
             // Fetch interests for this user
             $query = "SELECT i.id, i.name FROM interests i 
             JOIN user_interests ui ON i.id = ui.interest_id 
             WHERE ui.user_id = :user_id";
             $stmt = $this->conn->prepare($query);
             $stmt->bindParam(":user_id", $user['id']);
             $stmt->execute();
             $user['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
             return $user;
        }

        // 3. Fallback to random if no smart match
        return $this->getRandomUsers($currentUserId, [], 1)[0] ?? null;
    }

    public function getAdminUser() {
        $query = "SELECT id, name, avatar FROM " . $this->table_name . " WHERE is_admin = 1 LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getNameById($id) {
        $query = "SELECT name FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['name'] : null;
    }
}
