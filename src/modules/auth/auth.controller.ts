import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId, password } = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || '',
      };

      console.log('Device Info:', deviceInfo);
      const result = await this.authService.login(workerId, password);
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
}
