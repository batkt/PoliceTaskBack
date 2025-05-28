import { AppError } from '../../middleware/error.middleware';
import { Pagination } from '../../types/pagination';
import { hashPassword } from '../../utils/password.util';
import { AuthUserType, CreateUserType } from '../user/user.types';
import { UserModel } from './user.model';

export class UserService {
  register = async (user: AuthUserType, userData: CreateUserType) => {
    if (user.role !== 'super-admin') {
      throw new AppError(
        403,
        'Register user',
        'Та энэ үйлдлийг хийх эрхгүй байна.'
      );
    }

    // Ajiltanii code burtgeltei esehig shalgah
    const existingUser = await UserModel.findOne({
      workerId: userData.workerId,
    });

    if (existingUser) {
      throw new AppError(
        500,
        'User register',
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

  getList = async ({
    page = 1,
    pageSize = 10,
    sortBy = '_id',
    sortDirection = 'desc',
  }: Pagination) => {
    // Get users with pagination
    const skip = (page - 1) * pageSize;

    const users = await UserModel.find()
      .select('-password -__v -createdAt -updatedAt')
      .populate('branch', '_id name isParent')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(pageSize);

    const total = await UserModel.countDocuments();

    return {
      currentPage: page,
      rows: users,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  };

  getProfile = async (user: AuthUserType) => {
    const foundUser = await UserModel.findById(user.id)
      .select('-password -__v -createdAt -updatedAt')
      .populate('branch', '_id name isParent');

    return foundUser;
  };

  getAll = async () => {
    const users = await UserModel.find()
      .select('-password -__v -createdAt -updatedAt')
      .populate('branch', '_id name isParent');

    return users;
  };
}
