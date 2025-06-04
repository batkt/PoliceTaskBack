import { z } from 'zod';

const objectIdSchema = z.string().refine((val) => val.length === 24, {
  message: 'Гишүүн ID формат буруу байна.',
});

const dateSchema = z.preprocess((val) => {
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? undefined : d;
}, z.date());

export const taskSchema = {
  createMemoTask: z.object({
    title: z.string(),
    description: z.string().optional(),
    assigner: z.string().refine((val) => val.length === 24, {
      message: 'Хариуцагч ID формат буруу байна.',
    }),
    startDate: dateSchema,
    endDate: dateSchema,
    documentNumber: z.string(),
    marking: z.string().optional(),
    markingVoiceUrl: z.string().optional(),
    markingDate: dateSchema.optional(),
  }),

  createWorkGroupTask: z.object({
    title: z.string(),
    description: z.string().optional(),
    leader: z.string().refine((val) => val.length === 24, {
      message: 'Хариуцагч ID формат буруу байна.',
    }),
    assigner: z.string().refine((val) => val.length === 24, {
      message: 'Хариуцагч ID формат буруу байна.',
    }),
    members: z
      .array(objectIdSchema)
      .refine((arr) => arr.every((val) => val.length === 24), {
        message: 'Гишүүн ID формат буруу байна.',
      }),
    startDate: dateSchema,
    endDate: dateSchema,
    name: z.string(),
    marking: z.string().optional(),
    markingVoiceUrl: z.string().optional(),
    markingDate: dateSchema.optional(),
  }),
  changeStatus: z.object({
    taskId: z.string(),
    status: z.string(),
  }),
  taskId: z.object({
    taskId: z.string(),
  }),
};
