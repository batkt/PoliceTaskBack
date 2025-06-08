import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorName: string,
    public message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(200).json({
      code: err.statusCode,
      type: err.errorName,
      message: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(200).json({
        code: 400,
        type: 'File upload',
        message: 'Файлын хэмжээ хэтэрсэн (хамгийн ихдээ 10MB)',
      });
    }

    return res.status(200).json({
      code: 400,
      type: 'File upload',
      message: 'Файл хуулахад алдаа гарлаа: ' + err.message,
    });
  }
  // Log unexpected errors
  console.error('Unexpected error:', err);

  // For system errors, send 500 with full error details
  return res.status(500).json(err);
};

export default errorHandler;
