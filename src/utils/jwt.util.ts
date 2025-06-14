import jwt from 'jsonwebtoken';
import { Role } from '../types/roles';

type Payload = {
  userId: string;
  role: Role;
  branchId: string;
};

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

export const generateAccessToken = (payload: Payload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: '4h',
  });
};

export const verifyAccessToken = (token: string): Payload => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as Payload;
};
