import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './error.middleware';

export const validateRequest = (
  schema: AnyZodObject,
  type: 'all' | 'body' | 'query' | 'params'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (type === 'all') {
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      } else {
        await schema.parseAsync(req[type]);
      }

      next();
    } catch (error) {
      console.log(error);
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        next(new AppError(400, 'Validation error', errors[0].message));
      } else {
        next(error);
      }
    }
  };
};

export const validateRequestAll = (schema: AnyZodObject) => {
  return validateRequest(schema, 'all');
};

export const validateRequestBody = (schema: AnyZodObject) => {
  return validateRequest(schema, 'body');
};

export const validateRequestQuery = (schema: AnyZodObject) => {
  return validateRequest(schema, 'query');
};

export const validateRequestParams = (schema: AnyZodObject) => {
  return validateRequest(schema, 'params');
};
