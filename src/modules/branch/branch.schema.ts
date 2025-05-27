import { z } from 'zod';

export const branchSchema = {
  create: z.object({
    name: z.string().min(5, 'Салбарын нэр хэтэрхий богино байна.'),
    parentId: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || val.length === 24, {
        message: 'Эцэг салбарын ID нь 24 тэмдэгт урттай байх ёстой.',
      }),
  }),
};
