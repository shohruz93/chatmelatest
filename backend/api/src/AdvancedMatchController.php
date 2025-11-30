<?php

class AdvancedMatchController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Find compatible users with advanced scoring algorithm
     */
    public function findCompatibleUsers($userId, $filters = [], $limit = 10) {
        // Get current user's profile and preferences
        $userProfile = $this->getUserProfile($userId);
        $preferences = $this->getUserPreferences($userId);
        
        if (!$userProfile) {
            return [];
        }

        // Merge filters with preferences
        $filters = array_merge($preferences, $filters);

        // Get candidate users
        $candidates = $this->getCandidateUsers($userId, $filters);

        // Calculate compatibility scores
        $scoredCandidates = [];
        foreach ($candidates as $candidate) {
            $score = $this->calculateCompatibilityScore($userProfile, $candidate, $filters);
            $candidate['compatibility_score'] = $score['total'];
            $candidate['match_reasons'] = $score['reasons'];
            $scoredCandidates[] = $candidate;
        }

        // Sort by compatibility score (highest first)
        usort($scoredCandidates, function($a, $b) {
            return $b['compatibility_score'] <=> $a['compatibility_score'];
        });

        return array_slice($scoredCandidates, 0, $limit);
    }

    /**
     * Calculate compatibility score between two users
     */
    private function calculateCompatibilityScore($user1, $user2, $weights = []) {
        $score = 0;
        $reasons = [];
        
        // Default weights
        $interestWeight = $weights['interest_weight'] ?? 0.30;
        $languageWeight = $weights['language_weight'] ?? 0.25;
        $locationWeight = $weights['location_weight'] ?? 0.15;
        $ageWeight = 0.10;
        $activityWeight = 0.10;
        $ratingWeight = 0.10;

        // 1. Interest Matching (30%)
        $interestScore = $this->calculateInterestScore($user1['id'], $user2['id']);
        $score += $interestScore * $interestWeight * 100;
        if ($interestScore > 0.5) {
            $reasons[] = "Shared interests";
        }

        // 2. Language Compatibility (25%)
        $languageScore = $this->calculateLanguageScore($user1, $user2);
        $score += $languageScore * $languageWeight * 100;
        if ($languageScore > 0.7) {
            $reasons[] = "Language compatibility";
        }

        // 3. Location Preference (15%)
        $locationScore = 0;
        if (!empty($user1['location']) && !empty($user2['location'])) {
            if ($user1['location'] === $user2['location']) {
                $locationScore = 1.0;
                $reasons[] = "Same location";
            } else {
                $locationScore = 0.3; // Different location but still some score
            }
        }
        $score += $locationScore * $locationWeight * 100;

        // 4. Age Compatibility (10%)
        $ageScore = $this->calculateAgeScore($user1['age'] ?? 25, $user2['age'] ?? 25);
        $score += $ageScore * $ageWeight * 100;

        // 5. Activity Level (10%)
        $activityScore = $this->calculateActivityScore($user1['last_active'] ?? null, $user2['last_active'] ?? null);
        $score += $activityScore * $activityWeight * 100;
        if ($activityScore > 0.8) {
            $reasons[] = "Both active users";
        }

        // 6. Rating Score (10%)
        $ratingScore = $this->calculateRatingScore($user1['rating_score'] ?? 0, $user2['rating_score'] ?? 0);
        $score += $ratingScore * $ratingWeight * 100;
        if (($user2['rating_score'] ?? 0) >= 4.0) {
            $reasons[] = "Highly rated user";
        }

        return [
            'total' => round($score, 2),
            'reasons' => $reasons,
            'breakdown' => [
                'interests' => round($interestScore * 100, 2),
                'language' => round($languageScore * 100, 2),
                'location' => round($locationScore * 100, 2),
                'age' => round($ageScore * 100, 2),
                'activity' => round($activityScore * 100, 2),
                'rating' => round($ratingScore * 100, 2)
            ]
        ];
    }

    /**
     * Calculate interest overlap score
     */
    private function calculateInterestScore($userId1, $userId2) {
        $query = "
            SELECT COUNT(DISTINCT ui1.interest_id) as common_interests,
                   (SELECT COUNT(*) FROM user_interests WHERE user_id = :user1) as user1_total,
                   (SELECT COUNT(*) FROM user_interests WHERE user_id = :user2) as user2_total
            FROM user_interests ui1
            INNER JOIN user_interests ui2 ON ui1.interest_id = ui2.interest_id
            WHERE ui1.user_id = :user1 AND ui2.user_id = :user2
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([':user1' => $userId1, ':user2' => $userId2]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result['user1_total'] == 0 || $result['user2_total'] == 0) {
            return 0;
        }

        // Jaccard similarity
        $union = $result['user1_total'] + $result['user2_total'] - $result['common_interests'];
        return $union > 0 ? $result['common_interests'] / $union : 0;
    }

    /**
     * Calculate language compatibility score
     */
    private function calculateLanguageScore($user1, $user2) {
        $user1Native = explode(',', $user1['native_language'] ?? '');
        $user1Learning = explode(',', $user1['learning_language'] ?? '');
        $user2Native = explode(',', $user2['native_language'] ?? '');
        $user2Learning = explode(',', $user2['learning_language'] ?? '');

        $score = 0;

        // Perfect match: user1's learning is user2's native and vice versa
        $perfectMatch1 = count(array_intersect($user1Learning, $user2Native));
        $perfectMatch2 = count(array_intersect($user2Learning, $user1Native));
        if ($perfectMatch1 > 0 || $perfectMatch2 > 0) {
            $score += 0.8;
        }

        // Good match: shared native language
        $sharedNative = count(array_intersect($user1Native, $user2Native));
        if ($sharedNative > 0) {
            $score += 0.5;
        }

        // Decent match: shared learning language
        $sharedLearning = count(array_intersect($user1Learning, $user2Learning));
        if ($sharedLearning > 0) {
            $score += 0.3;
        }

        return min($score, 1.0);
    }

    /**
     * Calculate age compatibility score
     */
    private function calculateAgeScore($age1, $age2) {
        if (!$age1 || !$age2) return 0.5; // Neutral if age not provided
        
        $ageDiff = abs($age1 - $age2);
        
        if ($ageDiff <= 3) return 1.0;
        if ($ageDiff <= 5) return 0.9;
        if ($ageDiff <= 10) return 0.7;
        if ($ageDiff <= 15) return 0.5;
        return 0.3;
    }

    /**
     * Calculate activity level score
     */
    private function calculateActivityScore($lastActive1, $lastActive2) {
        if (!$lastActive1 || !$lastActive2) return 0.5;

        $now = time();
        $time1 = strtotime($lastActive1);
        $time2 = strtotime($lastActive2);

        $hoursSince1 = ($now - $time1) / 3600;
        $hoursSince2 = ($now - $time2) / 3600;

        // Both active recently
        if ($hoursSince1 <= 1 && $hoursSince2 <= 1) return 1.0;
        if ($hoursSince1 <= 24 && $hoursSince2 <= 24) return 0.8;
        if ($hoursSince1 <= 168 && $hoursSince2 <= 168) return 0.6; // Within a week
        
        return 0.4;
    }

    /**
     * Calculate rating compatibility score
     */
    private function calculateRatingScore($rating1, $rating2) {
        // Prefer matching users with similar high ratings
        $avgRating = ($rating1 + $rating2) / 2;
        
        if ($avgRating >= 4.5) return 1.0;
        if ($avgRating >= 4.0) return 0.9;
        if ($avgRating >= 3.5) return 0.8;
        if ($avgRating >= 3.0) return 0.7;
        
        return 0.5;
    }

    /**
     * Get candidate users based on filters
     */
    private function getCandidateUsers($userId, $filters) {
        $query = "SELECT u.* FROM users u WHERE u.id != :user_id";
        $params = [':user_id' => $userId];

        // Apply filters
        if (!empty($filters['preferred_gender']) && $filters['preferred_gender'] !== 'any') {
            $query .= " AND u.gender = :gender";
            $params[':gender'] = $filters['preferred_gender'];
        }

        if (!empty($filters['preferred_location']) && $filters['preferred_location'] !== 'any') {
            $query .= " AND u.location = :location";
            $params[':location'] = $filters['preferred_location'];
        }

        if (!empty($filters['preferred_age_min'])) {
            $query .= " AND (u.age IS NULL OR u.age >= :age_min)";
            $params[':age_min'] = $filters['preferred_age_min'];
        }

        if (!empty($filters['preferred_age_max'])) {
            $query .= " AND (u.age IS NULL OR u.age <= :age_max)";
            $params[':age_max'] = $filters['preferred_age_max'];
        }

        if (!empty($filters['min_rating'])) {
            $query .= " AND u.rating_score >= :min_rating";
            $params[':min_rating'] = $filters['min_rating'];
        }

        // Exclude recent matches
        $avoidHours = $filters['avoid_recent_matches_hours'] ?? 24;
        $query .= " AND u.id NOT IN (
            SELECT CASE 
                WHEN user1_id = :user_id THEN user2_id 
                ELSE user1_id 
            END as other_user_id
            FROM match_history
            WHERE (user1_id = :user_id OR user2_id = :user_id)
            AND created_at > DATE_SUB(NOW(), INTERVAL :avoid_hours HOUR)
        )";
        $params[':avoid_hours'] = $avoidHours;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get user profile
     */
    private function getUserProfile($userId) {
        $query = "SELECT * FROM users WHERE id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get user preferences
     */
    public function getUserPreferences($userId) {
        $query = "SELECT * FROM user_preferences WHERE user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $prefs = $stmt->fetch(PDO::FETCH_ASSOC);

        // Return defaults if no preferences set
        if (!$prefs) {
            return [
                'preferred_gender' => 'any',
                'preferred_location' => 'any',
                'preferred_age_min' => 18,
                'preferred_age_max' => 100,
                'online_only' => false,
                'min_rating' => 0.00,
                'avoid_recent_matches_hours' => 24,
                'interest_weight' => 0.30,
                'language_weight' => 0.25,
                'location_weight' => 0.15
            ];
        }

        return $prefs;
    }

    /**
     * Update user preferences
     */
    public function updatePreferences($userId, $preferences) {
        $query = "INSERT INTO user_preferences (
            user_id, preferred_gender, preferred_location, 
            preferred_age_min, preferred_age_max, online_only, 
            min_rating, avoid_recent_matches_hours
        ) VALUES (
            :user_id, :gender, :location, 
            :age_min, :age_max, :online_only, 
            :min_rating, :avoid_hours
        ) ON DUPLICATE KEY UPDATE
            preferred_gender = :gender,
            preferred_location = :location,
            preferred_age_min = :age_min,
            preferred_age_max = :age_max,
            online_only = :online_only,
            min_rating = :min_rating,
            avoid_recent_matches_hours = :avoid_hours";

        $stmt = $this->db->prepare($query);
        return $stmt->execute([
            ':user_id' => $userId,
            ':gender' => $preferences['gender'] ?? 'any',
            ':location' => $preferences['location'] ?? 'any',
            ':age_min' => $preferences['age_min'] ?? 18,
            ':age_max' => $preferences['age_max'] ?? 100,
            ':online_only' => $preferences['online_only'] ?? false,
            ':min_rating' => $preferences['min_rating'] ?? 0.00,
            ':avoid_hours' => $preferences['avoid_hours'] ?? 24
        ]);
    }

    /**
     * Record match history
     */
    public function recordMatch($user1Id, $user2Id, $compatibilityScore, $matchReasons) {
        $query = "INSERT INTO match_history (
            user1_id, user2_id, compatibility_score, match_reason, status
        ) VALUES (
            :user1_id, :user2_id, :score, :reasons, 'pending'
        )";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':user1_id' => $user1Id,
            ':user2_id' => $user2Id,
            ':score' => $compatibilityScore,
            ':reasons' => json_encode($matchReasons)
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Submit match feedback
     */
    public function submitFeedback($matchHistoryId, $raterId, $ratedId, $rating, $feedbackText = '') {
        $query = "INSERT INTO match_feedback (
            match_history_id, rater_id, rated_id, rating, feedback_text
        ) VALUES (
            :match_id, :rater_id, :rated_id, :rating, :feedback
        )";

        $stmt = $this->db->prepare($query);
        $result = $stmt->execute([
            ':match_id' => $matchHistoryId,
            ':rater_id' => $raterId,
            ':rated_id' => $ratedId,
            ':rating' => $rating,
            ':feedback' => $feedbackText
        ]);

        if ($result) {
            // Update user's rating score
            $this->updateUserRating($ratedId);
        }

        return $result;
    }

    /**
     * Update user's overall rating
     */
    private function updateUserRating($userId) {
        $query = "UPDATE users SET 
            rating_score = (SELECT AVG(rating) FROM match_feedback WHERE rated_id = :user_id),
            total_ratings = (SELECT COUNT(*) FROM match_feedback WHERE rated_id = :user_id)
            WHERE id = :user_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':user_id' => $userId]);
    }
}
