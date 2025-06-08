import { z } from 'zod';

export const authSchema = {
  login: z.object({
    workerId: z.string(),
    password: z.string(),
  }),

  registerSuperAdmin: z.object({
    workerId: z.string(),
    password: z.string(),
    surname: z.string(),
    givenname: z.string(),
    position: z.string(),
    rank: z.string(),
  }),

  changePassword: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  }),
};
