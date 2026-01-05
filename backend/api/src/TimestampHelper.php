<?php

class TimestampHelper {
    /**
     * Convert PHP TIMESTAMP string or Unix timestamp to Unix timestamp
     * @param string|int $timestamp MySQL TIMESTAMP format (YYYY-MM-DD HH:MM:SS) or Unix timestamp
     * @return int|null Unix timestamp in seconds, or null if invalid
     */
    public static function toUnix($timestamp) {
        if (empty($timestamp) && $timestamp !== 0 && $timestamp !== '0') {
            return null;
        }
        
        if ($timestamp === null) {
            return null;
        }
        
        if (is_numeric($timestamp)) {
            $numValue = (int)$timestamp;
            if ($numValue > 0) {
                return $numValue;
            }
        }
        
        $result = strtotime($timestamp);
        if ($result === false) {
            return null;
        }
        return (int)$result;
    }

    /**
     * Convert Unix timestamp to MySQL TIMESTAMP format
     * @param int $unixTimestamp Unix timestamp in seconds
     * @return string MySQL TIMESTAMP format (YYYY-MM-DD HH:MM:SS)
     */
    public static function fromUnix($unixTimestamp) {
        if (empty($unixTimestamp) || $unixTimestamp === null) {
            return null;
        }
        return date('Y-m-d H:i:s', $unixTimestamp);
    }

    /**
     * Get current time as Unix timestamp
     * @return int Current Unix timestamp
     */
    public static function now() {
        return time();
    }

    /**
     * Convert array of data rows, converting timestamp columns to Unix timestamps
     * @param array $rows Array of database rows
     * @param array $timestampColumns Column names that should be converted
     * @return array Rows with converted timestamps
     */
    public static function convertRowsToUnix(&$rows, $timestampColumns = []) {
        foreach ($rows as &$row) {
            foreach ($timestampColumns as $column) {
                if (isset($row[$column]) && !empty($row[$column])) {
                    $row[$column] = self::toUnix($row[$column]);
                }
            }
        }
        return $rows;
    }

    /**
     * Convert single row, converting timestamp columns to Unix timestamps
     * @param array $row Database row
     * @param array $timestampColumns Column names that should be converted
     * @return array Row with converted timestamps
     */
    public static function convertRowToUnix(&$row, $timestampColumns = []) {
        foreach ($timestampColumns as $column) {
            if (isset($row[$column]) && !empty($row[$column])) {
                $row[$column] = self::toUnix($row[$column]);
            }
        }
        return $row;
    }
}
