import { NextFunction, Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const user = await this.userService.register(authUser, req.body);
      res.status(201).json({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  getList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sortBy = (req.query.sortBy as string) || '_id';
      const sortDirection =
        (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
      const user = await this.userService.getList({
        page,
        pageSize,
        sortBy,
        sortDirection,
      });
      res.status(201).json({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const user = await this.userService.getProfile(authUser);
      res.send({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAll();
      res.send({
        code: 200,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };
}
