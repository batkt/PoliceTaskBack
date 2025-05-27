import { Request, Response, NextFunction } from 'express';

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

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // For system errors, send 500 with full error details
  return res.status(500).json(err);
};

export default errorHandler;
