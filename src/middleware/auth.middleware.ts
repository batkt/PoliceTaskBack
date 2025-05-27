import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthUserType } from '../modules/user/user.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserType;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Unauthorized', 'No authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'Unauthorized', 'No token provided');
    }

    try {
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.userId, role: decoded?.role }; // Assuming userId and role are in the token payload
      next();
    } catch (error) {
      console.log(error);
      throw new AppError(401, 'Unauthorized', 'Invalid token');
    }
  } catch (error) {
    next(error);
  }
};
