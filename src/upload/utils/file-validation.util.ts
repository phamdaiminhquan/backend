import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/**
 * Allowed image file extensions
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): void {
  const ext = path.extname(filename).toLowerCase();
  
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new BadRequestException(
      `Invalid file extension. Allowed extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    );
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimetype: string): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimetype.toLowerCase())) {
    throw new BadRequestException(
      `Invalid MIME type. Allowed types: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    );
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    );
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes any directory separators and special characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  const sanitized = filename
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore

  // Ensure filename is not empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    return 'file';
  }

  return sanitized;
}

/**
 * Generate unique filename using timestamp and random string
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, ext);
  
  // Generate timestamp
  const timestamp = Date.now();
  
  // Generate random string (6 characters)
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  // Combine: timestamp-random-originalname.ext
  return `${timestamp}-${randomStr}-${nameWithoutExt}${ext}`;
}

/**
 * Comprehensive file validation
 */
export function validateImageFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Validate file extension
  validateFileExtension(file.originalname);

  // Validate MIME type
  validateMimeType(file.mimetype);

  // Validate file size
  validateFileSize(file.size);
}

