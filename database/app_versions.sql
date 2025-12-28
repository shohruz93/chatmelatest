CREATE TABLE IF NOT EXISTS `app_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` enum('android','ios') NOT NULL,
  `version` varchar(20) NOT NULL,
  `version_code` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `release_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
