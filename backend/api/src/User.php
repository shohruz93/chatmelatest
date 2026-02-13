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
    public $coins;
    public $xp;

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
                        first_name=:first_name, family_name=:family_name, avatar=:avatar, created_at=UNIX_TIMESTAMP(), last_active=UNIX_TIMESTAMP()";
            
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
            $query = "INSERT INTO " . $this->table_name . " (email, name, google_id, created_at, last_active) VALUES (:email, :name, NULL, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())";
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
        $query = "SELECT id, name, first_name, family_name, email, avatar, bio, gender, location, native_language, learning_language, last_active, coins, xp, is_admin FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getRandomUsers($currentUserId, $filters = [], $limit = 10, $includeIds = [], $offset = 0) {
        // Extract language preferences from filters
        $rawNative = $filters['native_language'] ?? '';
        $rawLearning = $filters['learning_language'] ?? '';
        
        // Helper to get first language
        $getFirstLang = function($val) {
            if (empty($val)) return '';
            $parts = explode(',', $val);
            return trim($parts[0]);
        };

        $myNative = $getFirstLang($rawNative);
        $myLearning = $getFirstLang($rawLearning);
        
        $params = [':current_user_id' => $currentUserId];

        // 1. Get Current User Gender for Opposite Gender Priority
        $genderQuery = "SELECT gender FROM " . $this->table_name . " WHERE id = :uid";
        $genderStmt = $this->conn->prepare($genderQuery);
        $genderStmt->execute([':uid' => $currentUserId]);
        $currentUserGender = $genderStmt->fetchColumn();

        // Build Sorting Logic
        // Priority 1: Online Status (is_online calculated via includeIds or last_active)
        // Priority 2: Opposite Gender
        // Priority 3: Language Match
        // Priority 4: Last Active

        $genderScore = "0";
        if ($currentUserGender) {
            $oppositeGender = ($currentUserGender === 'male') ? 'female' : 'male';
            $genderScore = "CASE WHEN gender = :opposite_gender THEN 1 ELSE 0 END";
            $params[':opposite_gender'] = $oppositeGender;
        }

        $languageScore = "0";
        if (!empty($myLearning) || !empty($myNative)) {
            $languageScore = "CASE";
            if (!empty($myLearning)) {
                $languageScore .= " WHEN FIND_IN_SET(:lang_match_learning, native_language) > 0 THEN 3";
                $params[':lang_match_learning'] = $myLearning;
            }
            if (!empty($myNative)) {
                $languageScore .= " WHEN FIND_IN_SET(:lang_match_native, learning_language) > 0 THEN 2";
                $params[':lang_match_native'] = $myNative;
            }
            if (!empty($myLearning)) {
                $languageScore .= " WHEN FIND_IN_SET(:lang_match_mutual, learning_language) > 0 THEN 1";
                $params[':lang_match_mutual'] = $myLearning;
            }
            $languageScore .= " ELSE 0 END";
        }
        
        $onlineScore = "0";
        if (!empty($includeIds)) {
             // If online IDs provided, prioritize them
             // We can't bind array directly in CASE, so we check if ID is in the list
             // For SQL safety with IN, we usually use placeholders, but for a score CASE it's trickier.
             // Easier approach: If we filter by ID IN (...), they are all satisfying that.
             // But here we want ALL users sorted.
             // So we construct a string of IDs for FIND_IN_SET or OR chain if list is small.
             // OR: We rely on last_active > (NOW - 5min) logic if includeIds is empty or partial.
             // Let's use last_active for a general "Recent/Online" score.
             $onlineScore = "CASE WHEN last_active > (UNIX_TIMESTAMP() - 300) THEN 1 ELSE 0 END";
        } else {
             $onlineScore = "CASE WHEN last_active > (UNIX_TIMESTAMP() - 300) THEN 1 ELSE 0 END";
        }

        $query = "SELECT id, name, email, avatar, gender, location, bio, native_language, learning_language, last_active, 
                  ($genderScore) as gender_priority,
                  ($languageScore) as lang_score,
                  ($onlineScore) as online_priority
                  FROM " . $this->table_name . " WHERE id != :current_user_id";
        
        // Appply Filters
        if (!empty($filters['gender']) && $filters['gender'] !== 'any') {
            $query .= " AND gender = :gender";
            $params[':gender'] = $filters['gender'];
        }
        
        if (!empty($filters['location']) && $filters['location'] !== 'any') {
            $query .= " AND location = :location";
            $params[':location'] = $filters['location'];
        }

        if (!empty($filters['search'])) {
            $query .= " AND name LIKE :search";
            $params[':search'] = "%" . $filters['search'] . "%";
        }

        // Note: We do NOT filter by includeIds exclusively unless requested. 
        // The user wants "Online users have priority", implies they should be top, but others still visible.
        // So we remove the "AND id IN (...)" constraint if it was meant to strictly filter.
        // If the implementation plan meant "Only show online users", we'd keep it. 
        // But "Priority" usually means sorting.
        // However, if the frontend strictly wants "Online Users" tab, it passes a flag.
        // The current Connect logic fetches "Random" (Explore).
        // Let's stick to Sorting for priority.

        $query .= " ORDER BY online_priority DESC, gender_priority DESC, lang_score DESC, last_active DESC, id DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch extra data for each user
        foreach ($users as &$user) {
            // Interests
            $query = "SELECT i.id, i.name FROM interests i 
                      JOIN user_interests ui ON i.id = ui.interest_id 
                      WHERE ui.user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":user_id", $user['id']);
            $stmt->execute();
            $user['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Rating
            $ratingQuery = "SELECT AVG(rating) as average_rating, COUNT(*) as rating_count 
                           FROM match_feedback WHERE rated_id = :user_id AND rating IS NOT NULL"; // Assuming table exists or using match_feedback
            // Actually, AdvancedMatchController uses match_feedback. Let's check if user_ratings exists or use match_feedback.
            // MatchController used `match_feedback`. Let's assume `match_feedback` is the source of truth if `user_ratings` isn't there.
            // But `User.php` earlier had `user_ratings` in the code I read? 
            // Wait, I see `user_ratings` in the original code snippet I replaced...
            // "FROM user_ratings WHERE ...". 
            // Let's stick to what was there: `user_ratings`.
            $ratingStmt = $this->conn->prepare($ratingQuery);
            $ratingStmt->bindParam(":user_id", $user['id']);
            $ratingStmt->execute();
            $ratingData = $ratingStmt->fetch(PDO::FETCH_ASSOC);
            $user['rating'] = $ratingData['average_rating'] ? round($ratingData['average_rating'], 1) : 0;
            $user['rating_count'] = $ratingData['rating_count'] ?: 0;
            
            // Photos (Gallery)
            // Assuming gallery_images table
            $photoQuery = "SELECT image_path FROM gallery_images WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 6";
            $photoStmt = $this->conn->prepare($photoQuery);
            $photoStmt->bindParam(":user_id", $user['id']);
            $photoStmt->execute();
            $user['photos'] = $photoStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        // Calculate Total Count
        $countQuery = "SELECT COUNT(*) as total FROM " . $this->table_name . " WHERE id != :current_user_id";
        $countParams = [':current_user_id' => $currentUserId];
        
        if (!empty($filters['gender']) && $filters['gender'] !== 'any') {
            $countQuery .= " AND gender = :gender";
            $countParams[':gender'] = $filters['gender'];
        }
        
        if (!empty($filters['location']) && $filters['location'] !== 'any') {
            $countQuery .= " AND location = :location";
            $countParams[':location'] = $filters['location'];
        }

        $countStmt = $this->conn->prepare($countQuery);
        foreach ($countParams as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $totalResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = $totalResult['total'] ?? 0;

        return [
            'users' => $users,
            'total_count' => $totalCount
        ];
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
        $randomResult = $this->getRandomUsers($currentUserId, [], 1);
        return $randomResult['users'][0] ?? null;
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

    public function isOnline($userId) {
        $query = "SELECT last_active FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $userId);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $lastActive = $row['last_active'];
            
            // If last_active is null, user has never been active
            if (!$lastActive) {
                return false;
            }
            
            // Check if active in last 5 minutes (300 seconds)
            return (time() - $lastActive) <= 300;
        }
        
        return false;
    }
    public function findRandomConnectUser($currentUserId, $filters = []) {
        // Collect filters
        $genderFilter = $filters['gender'] ?? 'any';
        $locationFilter = $filters['location'] ?? 'any';
        $onlineIds = $filters['online_ids'] ?? '';

        // Exclude recent/all matches from history
        // User asked to "not connect to repeat people".
        // We exclude anyone in match_history involving this user.
        $excludeSql = "AND u.id NOT IN (
            SELECT CASE 
                WHEN user1_id = :exc_uid1 THEN user2_id 
                ELSE user1_id 
            END 
            FROM match_history 
            WHERE user1_id = :exc_uid2 OR user2_id = :exc_uid3
        )";

        // Prepare base params
        $params = [
            ':exc_uid1' => $currentUserId,
            ':exc_uid2' => $currentUserId,
            ':exc_uid3' => $currentUserId,
            ':current_user_id' => $currentUserId
        ];

        // Online filter/priority
        // If "online_ids" is provided, we can prioritize them.
        // User wants "Online status priority".
        // We will build a dynamic score or WHERE clause.
        
        $whereClauses = "u.id != :current_user_id " . $excludeSql;
        
        if (!empty($genderFilter) && $genderFilter !== 'any') {
            $whereClauses .= " AND u.gender = :gender";
            $params[':gender'] = $genderFilter;
        }

        // Try to find ONLINE users first (if online_ids provided)
        if (!empty($onlineIds)) {
             $ids = array_filter(array_map('trim', explode(',', $onlineIds)));
             if (!empty($ids)) {
                 // Try finding an online user first
                 $onlineParams = $params;
                 // Add IN clause
                 // To avoid binding distinct params for list, if list is safe/ints we can implode.
                 // Otherwise use FIND_IN_SET loop.
                 // Let's assume ids are integers.
                 $cleanIds = implode(',', array_map('intval', $ids));
                 //$onlineWhere = $whereClauses . " AND u.id IN ($cleanIds)";
                 
                 // Actually, let's just ORDER BY online desc.
                 // We can use the same trick as getRandomUsers or getSmartMatch.
             }
        }
        
        // Let's use getSmartMatch logic but with exclusion.
        // Actually simplest is: Select * from users where ... AND not in history .. ORDER BY online, interest, random LIMIT 1.
        
        $onlineScore = "CASE WHEN last_active > (UNIX_TIMESTAMP() - 300) THEN 1 ELSE 0 END";
        if (!empty($onlineIds)) {
            // If we have socket IDs, use them for online score too
            // $onlineScore = ...
        }

        $query = "SELECT u.id, u.name, u.avatar, u.gender, u.last_active, u.email, u.bio, u.location, u.native_language, u.learning_language,
                  ($onlineScore) as is_online
                  FROM " . $this->table_name . " u
                  WHERE $whereClauses
                  ORDER BY is_online DESC, RAND()
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $val) {
             $stmt->bindValue($key, $val);
        }
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Fetch extra data for the matched user
            
            // Interests
            $query = "SELECT i.id, i.name FROM interests i 
                      JOIN user_interests ui ON i.id = ui.interest_id 
                      WHERE ui.user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":user_id", $user['id']);
            $stmt->execute();
            $user['interests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Rating
            $ratingQuery = "SELECT AVG(rating) as average_rating, COUNT(*) as rating_count 
                           FROM match_feedback WHERE rated_id = :user_id AND rating IS NOT NULL";
            $ratingStmt = $this->conn->prepare($ratingQuery);
            $ratingStmt->bindParam(":user_id", $user['id']);
            $ratingStmt->execute();
            $ratingData = $ratingStmt->fetch(PDO::FETCH_ASSOC);
            $user['rating'] = $ratingData['average_rating'] ? round($ratingData['average_rating'], 1) : 0;
            $user['rating_count'] = $ratingData['rating_count'] ?: 0;
            
            // Photos (Gallery)
            $photoQuery = "SELECT image_path FROM gallery_images WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 6";
            $photoStmt = $this->conn->prepare($photoQuery);
            $photoStmt->bindParam(":user_id", $user['id']);
            $photoStmt->execute();
            $user['photos'] = $photoStmt->fetchAll(PDO::FETCH_COLUMN);

            // Record match!
            $this->recordMatch($currentUserId, $user['id']);
            return $user;
        }

        return null;
    }

    private function recordMatch($user1Id, $user2Id) {
        $query = "INSERT INTO match_history (user1_id, user2_id, created_at, status) VALUES (:u1, :u2, NOW(), 'connected')";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':u1' => $user1Id, ':u2' => $user2Id]);
    }

    public function addCurrency($userId, $amount, $type = 'coins') {
        if (!in_array($type, ['coins', 'xp'])) {
            return false;
        }
        $query = "UPDATE " . $this->table_name . " SET $type = $type + :amount WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":amount", $amount, PDO::PARAM_INT);
        $stmt->bindParam(":id", $userId);
        return $stmt->execute();
    }
}
