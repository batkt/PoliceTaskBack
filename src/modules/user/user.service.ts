import { AppError } from '../../middleware/error.middleware';
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
      password: hashedPassword,
      createdBy: user.id,
    });

    await newUser.save();

    const { password, ...newUserData } = newUser.toObject();
    return newUserData;
  };
}
