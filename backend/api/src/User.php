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
            // Update existing user with latest name information
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            
            // Update name fields if provided by Google
            $updateQuery = "UPDATE " . $this->table_name . " 
                           SET name = :name, 
                               first_name = :first_name, 
                               family_name = :family_name 
                           WHERE id = :id";
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->bindParam(":name", $googleUser['name']);
            $updateStmt->bindParam(":first_name", $googleUser['given_name']);
            $updateStmt->bindParam(":family_name", $googleUser['family_name']);
            $updateStmt->bindParam(":id", $this->id);
            $updateStmt->execute();
            
            return $this->id;
        } else {
            // Create new user
            $query = "INSERT INTO " . $this->table_name . " 
                    SET google_id=:google_id, email=:email, name=:name, 
                        first_name=:first_name, family_name=:family_name, avatar=:avatar";
            
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(":google_id", $googleUser['sub']);
            $stmt->bindParam(":email", $googleUser['email']);
            $stmt->bindParam(":name", $googleUser['name']);
            $stmt->bindParam(":first_name", $googleUser['given_name']);
            $stmt->bindParam(":family_name", $googleUser['family_name']);
            $stmt->bindParam(":avatar", $googleUser['picture']);

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
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
}
