import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthUserType } from '../modules/user/user.types';
import { ExtendedError, Socket } from 'socket.io';

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
      req.user = {
        id: decoded.userId,
        role: decoded?.role,
        branchId: decoded.branchId,
      }; // Assuming userId and role are in the token payload
      next();
    } catch (error) {
      console.log(error);
      throw new AppError(401, 'Unauthorized', 'Invalid token');
    }
  } catch (error) {
    next(error);
  }
};

export const socketAuthenticate = (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));

  try {
    const decoded = verifyAccessToken(token);

    socket.data.userId = decoded.userId;
    next();
  } catch {
    return next(new Error('Invalid token'));
  }
};
