import { z } from 'zod';

const objectIdSchema = z.string().refine((val) => val.length === 24, {
  message: 'Гишүүн ID формат буруу байна.',
});

export const taskSchema = {
  createMemoTask: z.object({
    title: z.string(),
    description: z.string().optional(),
    assigner: z.string().refine((val) => val.length === 24, {
      message: 'Хариуцагч ID формат буруу байна.',
    }),
    startDate: z.string().date(),
    endDate: z.string().date(),
    documentNumber: z.string(),
    marking: z.string().optional(),
    markingVoiceUrl: z.string().optional(),
    markingDate: z.string().date().optional(),
  }),

  createWorkGroupTask: z.object({
    title: z.string(),
    description: z.string().optional(),
    leader: z.string().refine((val) => val.length === 24, {
      message: 'Хариуцагч ID формат буруу байна.',
    }),
    members: z
      .array(objectIdSchema)
      .refine((arr) => arr.every((val) => val.length === 24), {
        message: 'Гишүүн ID формат буруу байна.',
      }),
    startDate: z.string().date(),
    endDate: z.string().date(),
    name: z.string(),
    marking: z.string().optional(),
    markingVoiceUrl: z.string().optional(),
    markingDate: z.string().date().optional(),
  }),
};
