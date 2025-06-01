import { z } from 'zod';

export const userSchema = {
  register: z.object({
    workerId: z.string(),
    surname: z.string(),
    givenname: z.string(),
    position: z.string(),
    rank: z.string(),
    branchId: z.string().refine((val) => val.length === 24, {
      message: 'Салбарын ID формат буруу байна.',
    }),
    role: z.enum(['user', 'admin', 'super-admin']).default('user'),
    password: z.string(),
    joinedDate: z.string().date().optional(),
  }),
  list: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
};
