import { AppError } from '../../middleware/error.middleware';
import { generateAccessToken } from '../../utils/jwt.util';
import { comparePassword, hashPassword } from '../../utils/password.util';
import { UserModel } from '../user/user.model';
import { RegisterAdminType } from './autrh.types';

interface DeviceInfo {
  userAgent: string;
  ip: string;
}

export class AuthService {
  async login(workerId: string, password: string) {
    // Find user
    const user = await UserModel.findOne({
      workerId: workerId,
    });

    if (!user) {
      throw new AppError(
        500,
        'Login error',
        'Ажилтны код эсвэл нууц үг буруу байна.'
      );
    }

    // Verify password
    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      throw new AppError(
        500,
        'Login error',
        'Ажилтны код эсвэл нууц үг буруу байна.'
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id!.toString(),
      role: user.role,
    });

    const { password: uPass, ...userWithoutPassword } = user.toObject();

    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  registerSuperAdmin = async (adminData: RegisterAdminType) => {
    // Check if workerId already exists
    const existingUser = await UserModel.findOne({
      workerId: adminData.workerId,
    });

    if (existingUser) {
      throw new AppError(
        500,
        'Super admin registration',
        `${adminData.workerId} код бүртгэлтэй байна.`
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(adminData.password);

    // Create new super admin user
    const newUser = new UserModel({
      ...adminData,
      password: hashedPassword,
      role: 'super-admin',
    });

    await newUser.save();

    const { password, ...newUserData } = newUser.toObject();
    return newUserData;
  };
}
