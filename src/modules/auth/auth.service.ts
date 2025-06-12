import { Types } from 'mongoose';
import { AppError } from '../../middleware/error.middleware';
import { generateAccessToken } from '../../utils/jwt.util';
import { comparePassword, hashPassword } from '../../utils/password.util';
import { FileModel } from '../file/file.model';
import { LoginHistoryService } from '../login-history/login-history.service';
import { UserModel } from '../user/user.model';
import { AuthUserType } from '../user/user.types';
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
      branchId: user.branch.toString(),
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

  changePassword = async (
    authUser: AuthUserType,
    data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }
  ) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    if (newPassword !== confirmPassword) {
      throw new AppError(
        400,
        'Change password',
        'Баталгаажуулах нууц үг шинэ нууц үгтэй тохирохгүй байна'
      );
    }
    const user = await UserModel.findById(authUser.id);

    if (!user) {
      throw new AppError(500, 'Change password', 'Хэрэглэгч олдсонгүй.');
    }
    const validPassword = await comparePassword(currentPassword, user.password);

    if (!validPassword) {
      throw new AppError(
        400,
        'Change password',
        'Одоогийн нууц үг буруу байна'
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    user.password = hashedPassword;

    await user.save();
    return true;
  };

  changeProfileImage = async (
    authUser: AuthUserType,
    data: { fileId: string; imageUrl: string }
  ) => {
    const { fileId, imageUrl } = data;
    const user = await UserModel.findById(authUser.id);

    if (!user) {
      throw new AppError(500, 'Change avatar', 'Хэрэглэгч олдсонгүй.');
    }

    if (user.profileImage) {
      const currentProfileImage = await FileModel.findById(user.profileImage);

      if (currentProfileImage) {
        currentProfileImage.isActive = false;
        await currentProfileImage.save();
      }
    }

    user.profileImage = new Types.ObjectId(fileId);
    user.profileImageUrl = imageUrl;
    await user.save();

    const userObj = user.toJSON() as { [key: string]: any };
    delete userObj.password;
    delete userObj.__v;

    await FileModel.findByIdAndUpdate(fileId, {
      isActive: true,
    });
    return userObj;
  };
}
