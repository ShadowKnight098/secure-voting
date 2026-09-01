import { errorResponse } from '../utils/helpers.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File too large. Maximum size is 5MB.', 400, err);
    }
    return errorResponse(res, `Multer error: ${err.message}`, 400, err);
  }

  // Handle SQLite constraint errors
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return errorResponse(res, 'Database constraint violation.', 400, err);
  }

  if (err.message === 'Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed.') {
      return errorResponse(res, err.message, 400, err);
  }

  return errorResponse(res, err.message || 'Internal server error', 500, err);
};
