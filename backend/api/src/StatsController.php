<?php

class StatsController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * GET /stats/public
     * Returns public-facing statistics for the home page.
     * No authentication required.
     * Cached result returned via Cache-Control header.
     */
    public function getPublicStats() {
        header('Content-Type: application/json');
        header('Cache-Control: public, max-age=300'); // Cache 5 minutes in browser/CDN

        try {
            // Total registered users
            $stmtUsers = $this->db->prepare("SELECT COUNT(*) as total FROM users WHERE is_banned = 0");
            $stmtUsers->execute();
            $totalUsers = (int)($stmtUsers->fetch()['total'] ?? 0);

            // Online users (last_active within 5 minutes)
            $stmtOnline = $this->db->prepare(
                "SELECT COUNT(*) as total FROM users 
                 WHERE is_banned = 0 
                 AND last_active >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
            );
            $stmtOnline->execute();
            $onlineUsers = (int)($stmtOnline->fetch()['total'] ?? 0);

            // Distinct countries (location field)
            $stmtCountries = $this->db->prepare(
                "SELECT COUNT(DISTINCT location) as total FROM users 
                 WHERE is_banned = 0 AND location IS NOT NULL AND location != ''"
            );
            $stmtCountries->execute();
            $totalCountries = (int)($stmtCountries->fetch()['total'] ?? 0);

            // Total messages exchanged
            $stmtMessages = $this->db->prepare("SELECT COUNT(*) as total FROM messages");
            $stmtMessages->execute();
            $totalMessages = (int)($stmtMessages->fetch()['total'] ?? 0);

            // Distinct languages (native_language + learning_language combined)
            $stmtLangs = $this->db->prepare(
                "SELECT COUNT(DISTINCT native_language) as total FROM users 
                 WHERE is_banned = 0 AND native_language IS NOT NULL AND native_language != ''"
            );
            $stmtLangs->execute();
            $totalLanguages = (int)($stmtLangs->fetch()['total'] ?? 0);

            echo json_encode([
                'success'         => true,
                'totalUsers'      => $totalUsers,
                'onlineUsers'     => $onlineUsers,
                'totalCountries'  => $totalCountries,
                'totalMessages'   => $totalMessages,
                'totalLanguages'  => max($totalLanguages, 30), // at least 30
                'generatedAt'     => date('c')
            ]);
        } catch (Exception $e) {
            error_log('[StatsController] Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to fetch stats']);
        }
    }
}
