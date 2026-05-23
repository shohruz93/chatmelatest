<?php

class ImageOptimizer {
    /**
     * Resizes and converts an image to high-efficiency WebP format.
     * If GD extension or WebP support is not available, it gracefully falls back to copy.
     *
     * @param string $sourcePath Path to the temporary uploaded file
     * @param string $destinationPath Target file path (should end with .webp)
     * @param int $maxWidth Maximum width of the image
     * @param int $maxHeight Maximum height of the image
     * @param int $quality Quality setting (0-100, default 80)
     * @return bool True if successful, false otherwise
     */
    public static function optimizeToWebp($sourcePath, $destinationPath, $maxWidth, $maxHeight, $quality = 80) {
        if (!file_exists($sourcePath)) {
            return false;
        }

        // Self-healing fallback: Check if GD library and support for WebP exist
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp') || !function_exists('imagecreatetruecolor')) {
            // Log warning or notify system, then fallback to simple move/copy
            error_log("GD Library or WebP support is missing. Falling back to copy.");
            return copy($sourcePath, $destinationPath);
        }

        try {
            // Read image content
            $imageContent = file_get_contents($sourcePath);
            if ($imageContent === false) {
                return copy($sourcePath, $destinationPath);
            }

            // Create GD image from string automatically (supports JPG, PNG, GIF, WebP)
            $sourceImg = @imagecreatefromstring($imageContent);
            if ($sourceImg === false) {
                error_log("Failed to create image from uploaded source data.");
                return copy($sourcePath, $destinationPath);
            }

            // Get original dimensions
            $width = imagesx($sourceImg);
            $height = imagesy($sourceImg);

            if ($width <= 0 || $height <= 0) {
                imagedestroy($sourceImg);
                return copy($sourcePath, $destinationPath);
            }

            // Calculate new dimensions while maintaining aspect ratio
            $ratio = $width / $height;
            if ($width > $maxWidth || $height > $maxHeight) {
                if ($width / $maxWidth > $height / $maxHeight) {
                    $newWidth = $maxWidth;
                    $newHeight = (int)round($maxWidth / $ratio);
                } else {
                    $newHeight = $maxHeight;
                    $newWidth = (int)round($maxHeight * $ratio);
                }
            } else {
                $newWidth = $width;
                $newHeight = $height;
            }

            // Prevent division or float errors
            $newWidth = max(1, $newWidth);
            $newHeight = max(1, $newHeight);

            // Create target truecolor image
            $newImg = imagecreatetruecolor($newWidth, $newHeight);
            if ($newImg === false) {
                imagedestroy($sourceImg);
                return copy($sourcePath, $destinationPath);
            }

            // Handle transparency preservation for PNG and WebP
            imagealphablending($newImg, false);
            imagesavealpha($newImg, true);
            $transparentColor = imagecolorallocatealpha($newImg, 0, 0, 0, 127);
            imagefill($newImg, 0, 0, $transparentColor);

            // Resample original image into target dimensions
            if (!imagecopyresampled($newImg, $sourceImg, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height)) {
                imagedestroy($sourceImg);
                imagedestroy($newImg);
                return copy($sourcePath, $destinationPath);
            }

            // Write image to destination as WebP
            $success = @imagewebp($newImg, $destinationPath, $quality);

            // Cleanup resources
            imagedestroy($sourceImg);
            imagedestroy($newImg);

            if (!$success) {
                error_log("imagewebp conversion failed. Falling back to copy.");
                return copy($sourcePath, $destinationPath);
            }

            return true;
        } catch (Exception $e) {
            error_log("Error during WebP conversion: " . $e->getMessage());
            return copy($sourcePath, $destinationPath);
        }
    }
}
