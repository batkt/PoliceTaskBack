import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { LoginHistoryService } from '../login-history/login-history.service';
import { FilterQuery } from 'mongoose';
import { ILoginHistory } from '../login-history/login-history.model';

export class AuthController {
  private authService: AuthService;
  private loginHistoryService: LoginHistoryService;

  constructor() {
    this.authService = new AuthService();
    this.loginHistoryService = new LoginHistoryService();
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId, password } = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
      };

      const result = await this.authService.login(
        workerId,
        password,
        deviceInfo
      );
      res.send({
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  registerSuperAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = await this.authService.registerSuperAdmin(req.body);
      res.status(201).json({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await this.authService.changePassword(user, req.body);
      res.status(200).json({
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getLoginHistoryByUser = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const filters: FilterQuery<ILoginHistory> = {
        userId,
      };

      const history = await this.loginHistoryService.getLoginHistory({
        page,
        pageSize,
        filters,
      });

      res.status(200).json({
        code: 200,
        data: history,
      });
    } catch (error) {
      console.error('Login history fetch error:', error);
      res.status(500).json({ message: 'Login history fetch failed' });
    }
  };
}
