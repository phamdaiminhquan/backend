import { diskStorage } from 'multer';
import type { Express } from 'express';
import { Request } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  validateImageFile,
  generateUniqueFilename,
  MAX_FILE_SIZE,
} from '../utils/file-validation.util';

/**
 * Multer configuration for file uploads
 */
export const multerConfig = {
  // Storage configuration
  storage: diskStorage({
    // Destination directory
    destination: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      const uploadPath = path.join(process.cwd(), 'uploads');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      cb(null, uploadPath);
    },

    // Filename configuration
    filename: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      try {
        // Validate file before saving
        validateImageFile(file);
        
        // Generate unique filename
        const uniqueFilename = generateUniqueFilename(file.originalname);
        
        cb(null, uniqueFilename);
      } catch (error) {
        cb(error as Error, '');
      }
    },
  }),

  // File size limit
  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  // File filter for additional validation
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    try {
      validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(error as Error, false);
    }
  },
};

