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
            // Update existing user
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            // Ideally update name/avatar if changed, but for now just return id
            return $this->id;
        } else {
            // Create new user
            $query = "INSERT INTO " . $this->table_name . " 
                    SET google_id=:google_id, email=:email, name=:name, avatar=:avatar";
            
            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(":google_id", $googleUser['sub']);
            $stmt->bindParam(":email", $googleUser['email']);
            $stmt->bindParam(":name", $googleUser['name']);
            $stmt->bindParam(":avatar", $googleUser['picture']);

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return $this->id;
            }
        }
        return false;
    }

    public function getProfile($id) {
        $query = "SELECT id, name, email, avatar, bio, gender, location, native_language, learning_language FROM " . $this->table_name . " WHERE id = :id";
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
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
