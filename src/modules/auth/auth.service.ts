import { AppError } from '../../middleware/error.middleware';
import { generateAccessToken } from '../../utils/jwt.util';
import { comparePassword, hashPassword } from '../../utils/password.util';
import { LoginHistoryService } from '../login-history/login-history.service';
import { UserModel } from '../user/user.model';
import { RegisterAdminType } from './auth.types';

interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
}

export class AuthService {
  private loginHistoryService: LoginHistoryService;
  constructor() {
    this.loginHistoryService = new LoginHistoryService();
  }

  async login(workerId: string, password: string, deviceInfo: DeviceInfo) {
    // Find user
    const user = await UserModel.findOne({
      workerId: { $regex: `^${workerId}$`, $options: 'i' },
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
      await this.loginHistoryService.createLoginHistory({
        userId: user.id,
        ...deviceInfo,
        success: false,
        reason: 'Нууц үг буруу',
      });
      throw new AppError(
        500,
        'Login error',
        'Ажилтны код эсвэл нууц үг буруу байна.'
      );
    }

    // save login history
    await this.loginHistoryService.createLoginHistory({
      userId: user.id,
      ...deviceInfo,
      success: true,
    });

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
