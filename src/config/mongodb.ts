import mongoose from 'mongoose';
import { UserModel } from '../modules/user/user.model';
import { AuthService } from '../modules/auth/auth.service';
import { BranchModel } from '../modules/branch/branch.model';

const MONGODB_URI = process.env.MONGODB_URI!;
const ADMIN_WORKER_ID = process.env.ADMIN_WORKER_ID!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    console.log('✅ Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // add your mongoose options if needed
    });

    await createInitialData();
    isConnected = true;
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database', error);
    throw error;
  }
}

const createInitialData = async () => {
  const authService = new AuthService();

  if (!ADMIN_WORKER_ID || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_WORKER_ID or ADMIN_PASSWORD is not configured');
  }
  const adminUser = await UserModel.findOne({
    workerId: ADMIN_WORKER_ID,
  });

  if (!adminUser) {
    let branchId = null;
    const branchName = 'Тээврийн цагдаагийн алба';
    const parentBranch = await BranchModel.findOne({
      name: branchName,
    });

    if (!parentBranch) {
      const newBranch = await BranchModel.create({
        name: branchName,
        isParent: true, // эцэг салбар эсэх
        path: '',
      });
      console.log('created parent branch');
      branchId = newBranch?._id;
    } else {
      branchId = parentBranch?._id;
    }

    const newUser = await authService.registerSuperAdmin({
      workerId: ADMIN_WORKER_ID, // Ажилтны ID
      password: ADMIN_PASSWORD, // Нууц үг
      surname: 'Super', // Овог
      branch: branchId as string,
      givenname: 'Admin', // Нэр
      position: 'super-admin', // Албан тушаал
      rank: 'super-admin',
    });
    console.log('created admin user');
  }
};
export { mongoose };
