import { FilterQuery } from "mongoose";
import { AppError } from "../../middleware/error.middleware";
import { Pagination } from "../../types/pagination";
import { hashPassword } from "../../utils/password.util";
import { AuthUserType, CreateUserType } from "../user/user.types";
import { IUser, UserModel } from "./user.model";
import { LoginHistory } from "../login-history/login-history.model";

export class UserService {
  register = async (user: AuthUserType, userData: CreateUserType) => {
    // Ajiltanii code burtgeltei esehig shalgah
    const existingUser = await UserModel.findOne({
      workerId: userData.workerId,
    });

    if (existingUser) {
      throw new AppError(
        500,
        "User register",
        `${userData?.workerId} код бүртгэлтэй байна.`
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Register new user
    const newUser = new UserModel({
      ...userData,
      branch: userData?.branchId,
      password: hashedPassword,
      createdBy: user.id,
    });

    await newUser.save();

    const { password, ...newUserData } = newUser.toObject();
    return newUserData;
  };

  update = async (user: AuthUserType, userData: Partial<CreateUserType>) => {
    // Ajiltanii code burtgeltei esehig shalgah
    const foundUser = await UserModel.findOne({
      workerId: userData.workerId,
    });

    if (!foundUser) {
      throw new AppError(500, "User update", `Хэрэглэгч олдсонгүй.`);
    }

    // Update user
    await UserModel.updateOne(
      {
        workerId: userData.workerId,
      },
      {
        ...userData,
        branch: userData?.branchId,
      }
    );

    return true;
  };

  getList = async ({
    page = 1,
    pageSize = 10,
    sortBy = "_id",
    sortDirection = "desc",
    filters = {},
  }: Pagination & {
    filters?: FilterQuery<IUser>;
  }) => {
    // Get users with pagination
    const skip = (page - 1) * pageSize;

    const users = await UserModel.find(filters)
      .select("-password -__v -createdAt -updatedAt")
      .populate("branch", "_id name isParent")
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(pageSize);

    const total = await UserModel.find(filters).countDocuments();

    return {
      currentPage: page,
      rows: users,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  };

  getProfile = async (user: AuthUserType) => {
    const foundUser = await UserModel.findById(user.id)
      .select("-password -__v -createdAt -updatedAt")
      .populate("branch", "_id name isParent path")
      .lean();

    const lastLogin = await LoginHistory.findOne({
      userId: user.id,
      success: true,
    })
      .sort({ createdAt: -1 })
      .select("-__v -reason")
      .lean();

    return { ...foundUser, lastLogin };
  };

  getAll = async () => {
    const users = await UserModel.find()
      .select("-password -__v -createdAt -updatedAt")
      .populate("branch", "_id name isParent");

    return users;
  };

  getUsersByIds = async (ids: string[]) => {
    const users = await UserModel.find({
      _id: {
        $in: ids,
      },
    })
      .select("-password -__v -createdAt -updatedAt")
      .populate("branch", "_id name isParent")
      .lean();

    return users;
  };

  changeUserPassword = async (
    user: AuthUserType,
    data: { userId: string; newPassword: string }
  ) => {
    const foundUser = await UserModel.findById(data.userId);

    if (!foundUser) {
      throw new AppError(500, "Change user password", `Хэрэглэгч олдсонгүй.`);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.newPassword);

    await UserModel.updateOne(
      {
        _id: data.userId,
      },
      {
        password: hashedPassword,
      }
    ).exec();

    return true;
  };
}
