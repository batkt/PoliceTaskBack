import { NextFunction, Request, Response } from 'express';
import { UserService } from './user.service';
import { IUser } from './user.model';
import { escapeRegex, parseFilters } from '../../utils/filter.util';
import { FilterQuery } from 'mongoose';

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
      const sortBy = (req.query.sort as string) || '_id';
      const sortDirection =
        (req.query.order as string) === 'asc' ? 'asc' : 'desc';

      const search = req.query.search as string;

      let filters: FilterQuery<IUser> = {};
      if (search) {
        filters.$or = [
          { surname: { $regex: escapeRegex(search), $options: 'i' } },
          { givenname: { $regex: escapeRegex(search), $options: 'i' } },
          { rank: { $regex: escapeRegex(search), $options: 'i' } },
          { position: { $regex: escapeRegex(search), $options: 'i' } },
        ];
      }

      const user = await this.userService.getList({
        page,
        pageSize,
        sortBy,
        sortDirection,
        filters,
      });
      res.status(200).json({
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
