import { NextFunction, Request, Response } from 'express';
import { NoteService } from './note.servce';
import { canAccess } from '../../middleware/permission.middleware';
import { AppError } from '../../middleware/error.middleware';
import { AdminActions, UserActions } from '../../types/roles';

export class NoteController {
  private noteService;

  constructor() {
    this.noteService = new NoteService();
  }

  removeNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const result = await this.noteService.removeNote(authUser, req.body);

      res.status(201).json({
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTaskNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const taskId = req.params.taskId;
      const result = await this.noteService.getTaskNotes(taskId);

      res.status(201).json({
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
