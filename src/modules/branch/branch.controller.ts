import { NextFunction, Request, Response } from 'express';
import { BranchService } from './branch.service';

export class BranchController {
  private branchService: BranchService;

  constructor() {
    this.branchService = new BranchService();
  }

  createBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const branch = await this.branchService.createBranch(authUser, req.body);
      res.status(201).json({
        code: 200,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  };
}
