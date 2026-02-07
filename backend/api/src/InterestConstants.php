<?php

/**
 * Valid interest keys used across all languages
 * These keys are language-independent and used for matching
 */
class InterestConstants {
    const VALID_INTERESTS = [
        'TRAVEL',
        'READING',
        'SPORTS',
        'MUSIC',
        'MOVIES',
        'COOKING',
        'PHOTOGRAPHY',
        'GAMING',
        'ART',
        'TECHNOLOGY',
        'FITNESS',
        'NATURE',
        'FASHION',
        'WRITING',
        'DANCING',
        'LEARNING_LANGUAGES',
        'VOLUNTEERING',
        'MEDITATION',
        'PETS',
        'FOOD'
    ];

    /**
     * Check if an interest key is valid
     * @param string $key The interest key to validate
     * @return bool True if valid, false otherwise
     */
    public static function isValid($key) {
        return in_array($key, self::VALID_INTERESTS, true);
    }

    /**
     * Validate an array of interest keys
     * @param array $keys Array of interest keys
     * @return array Array with 'valid' boolean and 'invalid_keys' array
     */
    public static function validateKeys($keys) {
        $invalid = [];
        foreach ($keys as $key) {
            if (!self::isValid($key)) {
                $invalid[] = $key;
            }
        }
        return [
            'valid' => empty($invalid),
            'invalid_keys' => $invalid
        ];
    }
}
