import { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service";
import { IUser } from "./user.model";
import { FilterQuery } from "mongoose";
import {
  canAccess,
  getAccessibleBranches,
} from "../../middleware/permission.middleware";
import { AdminActions } from "../../types/roles";
import { AppError } from "../../middleware/error.middleware";
import { BranchService } from "../branch/branch.service";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;

      const branches = await getAccessibleBranches(authUser);

      if (
        !branches.includes("*") &&
        !branches.includes(req.body?.branchId || "")
      ) {
        throw new AppError(
          403,
          "Register user",
          "Та тус алба, хэлтэст алба хаагч бүртгэх эрхгүй байна."
        );
      }

      if (!canAccess(authUser, AdminActions.REGISTER_USER)) {
        throw new AppError(
          403,
          "Register user",
          "Та энэ үйлдлийг хийх эрхгүй байна."
        );
      }

      const user = await this.userService.register(authUser, req.body);
      res.status(201).json({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;

      const branches = await getAccessibleBranches(authUser);

      if (
        !branches.includes("*") &&
        !branches.includes(req.body?.branchId || "")
      ) {
        throw new AppError(
          403,
          "Update user",
          "Та тус алба, хэлтэст алба хаагч бүртгэх эрхгүй байна."
        );
      }

      if (!canAccess(authUser, AdminActions.UPDATE_USER)) {
        throw new AppError(
          403,
          "Update user",
          "Та энэ үйлдлийг хийх эрхгүй байна."
        );
      }

      const user = await this.userService.update(authUser, req.body);
      res.status(201).json({
        code: 200,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  changeUserPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;

      if (!canAccess(authUser, AdminActions.CHANGE_USER_PASSWORD)) {
        throw new AppError(
          403,
          "Change password user",
          "Та энэ үйлдлийг хийх эрхгүй байна."
        );
      }

      const user = await this.userService.changeUserPassword(authUser, req.body);
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
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sortBy = (req.query.sort as string) || "_id";
      const sortDirection =
        (req.query.order as string) === "asc" ? "asc" : "desc";

      const search = req.query.search as string;
      const branchId = req.query.branchId as string;
      const userIds = req.query.userIds as string;

      let filters: FilterQuery<IUser> = {};
      if (authUser.role === "super-admin") {
        filters = {}; // unrestricted
      } else if (authUser.role === "admin") {
        const branches = await getAccessibleBranches(authUser);
        filters = { branch: { $in: branches } };
      } else {
        // user өөрийн даалгавар л үзнэ
        filters = { branch: authUser.branchId };
      }

      if (search) {
        filters.$text = {
          $search: search,
        };
      }

      if (branchId) {
        const branchService = new BranchService();
        const branches = await branchService.getBranchWithChildren(branchId);
        filters.branch = {
          $in: branches.map((b) => b.id),
        };
      }

      if (userIds) {
        const ids = userIds.split("|");
        filters._id = {
          $in: ids,
        };
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

  getUsersByIds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idsString = req.query.ids as string;
      const ids = idsString.split(",");
      const users = await this.userService.getUsersByIds(ids);
      res.send({
        code: 200,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };
}
