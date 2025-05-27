import { z } from 'zod';

export const userSchema = {
  register: z.object({
    workerId: z.string(),
    surname: z.string(),
    givenname: z.string(),
    position: z.string(),
    rank: z.string(),
    branchId: z.string().uuid('Салбарын ID формат буруу байна.'),
    role: z.enum(['user', 'admin', 'super-admin']).default('user'),
    password: z.string(),
    joiningDate: z.date().optional(),
  }),
};
