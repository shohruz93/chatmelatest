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
        $query = "SELECT id, first_name, family_name FROM " . $this->table_name . " WHERE google_id = :google_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":google_id", $googleUser['sub']);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            // User exists: Check if names need updating
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            
            // Update names if they are empty
            $query = "UPDATE " . $this->table_name . " 
                      SET first_name = :first_name,
                          family_name = :family_name
                      WHERE id = :id AND (first_name IS NULL OR first_name = '' OR family_name IS NULL OR family_name = '')";
            
            $updateStmt = $this->conn->prepare($query);
            
            $firstName = !empty($row['first_name']) ? $row['first_name'] : ($googleUser['given_name'] ?? '');
            $familyName = !empty($row['family_name']) ? $row['family_name'] : ($googleUser['family_name'] ?? '');

            $updateStmt->bindParam(":first_name", $firstName);
            $updateStmt->bindParam(":family_name", $familyName);
            $updateStmt->bindParam(":id", $this->id);
            
            $updateStmt->execute();

            // Update last_active on login
            $this->updateLastActive($this->id);

            return $this->id;
        } else {
            // Create new user
            $fullName = trim(($googleUser['given_name'] ?? '') . ' ' . ($googleUser['family_name'] ?? ''));
            if (empty($fullName)) {
                $fullName = 'New User';
            }

            $query = "INSERT INTO " . $this->table_name . " 
                    SET google_id=:google_id, email=:email, name=:name, 
                        first_name=:first_name, family_name=:family_name, avatar=:avatar";
            
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(":google_id", $googleUser['sub']);
            $stmt->bindParam(":email", $googleUser['email']);
            $stmt->bindParam(":name", $fullName);
            $stmt->bindParam(":first_name", $googleUser['given_name']);
            $stmt->bindParam(":family_name", $googleUser['family_name']);
            $stmt->bindParam(":avatar", $googleUser['picture']);
            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                
                // If name was 'New User', update it to 'User {id}' as fallback 
                // but if we actually got a name, keep it.
                if ($fullName === 'New User') {
                    $updateNameQuery = "UPDATE " . $this->table_name . " SET name = :name WHERE id = :id";
                    $updateNameStmt = $this->conn->prepare($updateNameQuery);
                    $newName = "User " . $this->id;
                    $updateNameStmt->bindParam(":name", $newName);
                    $updateNameStmt->bindParam(":id", $this->id);
                    $updateNameStmt->execute();
                }

                return $this->id;
            }
        }
        return false;
    }

    public function createOrGetByEmail($email) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            return $this->id;
        } else {
            $query = "INSERT INTO " . $this->table_name . " (email, name) VALUES (:email, :name)";
            $stmt = $this->conn->prepare($query);
            $defaultName = 'User';
            $stmt->bindParam(":email", $email);
            $stmt->bindParam(":name", $defaultName);
            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                // Optionally set a default name
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
        $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, native_language, learning_language, last_active FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getRandomUsers($currentUserId, $filters = [], $limit = 10, $includeIds = []) {
        $query = "SELECT id, name, email, avatar, gender, location, bio, native_language, learning_language, last_active FROM " . $this->table_name . " WHERE id != :current_user_id";
        
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

    public function getSmartMatch($currentUserId, $filters = []) {
        // Collect filters
        $genderFilter = $filters['gender'] ?? 'any';
        $locationFilter = $filters['location'] ?? 'any';
        $nativeLang = $filters['native'] ?? '';
        $learningLang = $filters['learning'] ?? '';
        $onlineIds = $filters['online_ids'] ?? '';

        // 1. Get current user's interests
        $query = "SELECT interest_id FROM user_interests WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $currentUserId);
        $stmt->execute();
        $myInterests = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Prepare optional WHERE clauses for filters
        $extraWhere = '';
        $params = [];
        if (!empty($genderFilter) && $genderFilter !== 'any') {
            $extraWhere .= " AND u.gender = :gender";
            $params[':gender'] = $genderFilter;
        }
        if (!empty($locationFilter) && $locationFilter !== 'any') {
            $extraWhere .= " AND u.location = :location";
            $params[':location'] = $locationFilter;
        }
        if (!empty($onlineIds)) {
            // online_ids is a comma-separated list
            $ids = array_filter(array_map('trim', explode(',', $onlineIds)));
            if (!empty($ids)) {
                $placeholders = [];
                foreach ($ids as $i => $id) {
                    $key = ":online_id_$i";
                    $placeholders[] = $key;
                    $params[$key] = $id;
                }
                $extraWhere .= " AND u.id IN (" . implode(',', $placeholders) . ")";
            }
        }

        // If user has interests, prioritize matches by shared interests + language/location
        if (!empty($myInterests)) {
            $inQuery = implode(',', array_fill(0, count($myInterests), '?'));

            $sql = "
                SELECT u.id, u.name, u.avatar, u.gender, u.location, u.bio, u.native_language, u.learning_language,
                       COUNT(ui.interest_id) as shared_count
                FROM users u
                JOIN user_interests ui ON u.id = ui.user_id
                WHERE u.id != ?
                AND ui.interest_id IN ($inQuery)
                $extraWhere
                GROUP BY u.id
                ORDER BY shared_count DESC, RAND()
                LIMIT 1
            ";

            $stmt = $this->conn->prepare($sql);

            // Bind params: currentUserId then interest IDs
            $execParams = array_merge([$currentUserId], $myInterests);
            // Add named params
            foreach ($params as $k => $v) {
                // do nothing here; will bind later
            }

            $stmt->execute($execParams);
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
        }

        // If we couldn't find by interests or user has no interests, try matching by language/location/gender
        // Build language match expression using FIND_IN_SET for potential comma lists
        $langConditions = [];
        if (!empty($nativeLang)) {
            $langConditions[] = "(FIND_IN_SET(:native, u.native_language) > 0 OR FIND_IN_SET(:native, u.learning_language) > 0)";
        }
        if (!empty($learningLang)) {
            $langConditions[] = "(FIND_IN_SET(:learning, u.native_language) > 0 OR FIND_IN_SET(:learning, u.learning_language) > 0)";
        }

        $whereClauses = "u.id != :current_user_id" . $extraWhere;
        $langWhere = '';
        if (!empty($langConditions)) {
            $langWhere = ' AND (' . implode(' OR ', $langConditions) . ')';
        }

        $finalSql = "SELECT u.id, u.name, u.avatar, u.gender, u.location, u.bio, u.native_language, u.learning_language
                     FROM users u
                     WHERE $whereClauses $langWhere
                     ORDER BY RAND()
                     LIMIT 1";

        $stmt = $this->conn->prepare($finalSql);
        $stmt->bindValue(':current_user_id', $currentUserId);
        if (!empty($params)) {
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
        }
        if (!empty($nativeLang)) $stmt->bindValue(':native', $nativeLang);
        if (!empty($learningLang)) $stmt->bindValue(':learning', $learningLang);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Fetch interests for this user (if any)
            $query = "SELECT i.id, i.name FROM interests i 
                      JOIN user_interests ui ON i.id = ui.interest_id 
                      WHERE ui.user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":user_id", $user['id']);
            $stmt->execute();
            $user['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $user;
        }

        // Fallback to random
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

    public function updateLastActive($userId) {
        // Store last_active as UNIX timestamp (seconds)
        $query = "UPDATE " . $this->table_name . " SET last_active = UNIX_TIMESTAMP() WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $userId);
        return $stmt->execute();
    }
}
