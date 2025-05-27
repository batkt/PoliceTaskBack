import { AppError } from '../../middleware/error.middleware';
import { AuthUserType } from '../user/user.types';
import { BranchModel } from './branch.model';
import { CreateBranchType } from './branch.types';

export class BranchService {
  createBranch = async (user: AuthUserType, branchData: CreateBranchType) => {
    const { name, parentId } = branchData;

    if (user.role !== 'super-admin') {
      throw new AppError(
        403,
        'Branch create',
        'Та энэ үйлдлийг хийх эрхгүй байна.'
      );
    }

    // Neg etsegtai ijil nertei salbar baina uu? shalgah
    const existingBranch = await BranchModel.findOne({
      name,
      parent: parentId || null,
    });

    if (existingBranch) {
      throw new AppError(
        500,
        'Branch create',
        `${branchData.name} бүртгэлтэй байна.`
      );
    }

    if (!parentId) {
      // ParentId bhgui bol esteg salbar uusgeh
      const newParentBranch = new BranchModel({
        name,
        isParent: true, // If no parent, it's a parent branch
        createdBy: user.id,
      });

      await newParentBranch.save();
      return newParentBranch;
    }

    // ParentId-r salbar oldohgui bol
    if (parentId) {
      const parentBranch = await BranchModel.findById(parentId).exec();
      if (!parentBranch) {
        throw new AppError(500, 'Branch create', `Дээд салбар олдсонгүй.`);
      }
    }

    // Create new branch
    const newBranch = new BranchModel({
      name,
      parent: parentId,
      createdBy: user.id,
    });

    await newBranch.save();
    // Update parent branch to indicate it has children
    return newBranch;
  };
}
