<?php

class AppVersion {
    private $conn;
    private $table_name = "app_versions";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getLatestVersion($platform) {
        $cacheKey = "app_version_latest_" . $platform;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE platform = :platform 
                  ORDER BY CAST(version_code AS UNSIGNED) DESC 
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":platform", $platform);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        Cache::set($cacheKey, $result, 86400); // Cache for 24 hours
        return $result;
    }

    public function create($platform, $version, $version_code, $file_path, $release_notes) {
        $query = "INSERT INTO " . $this->table_name . "
                  (platform, version, version_code, file_path, release_notes)
                  VALUES
                  (:platform, :version, :version_code, :file_path, :release_notes)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":platform", $platform);
        $stmt->bindParam(":version", $version);
        $stmt->bindParam(":version_code", $version_code);
        $stmt->bindParam(":file_path", $file_path);
        $stmt->bindParam(":release_notes", $release_notes);

        if ($stmt->execute()) {
            Cache::delete("app_version_latest_" . $platform);
            return true;
        }
        return false;
    }

    public function getAllVersions() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
