import { AppError } from '../../middleware/error.middleware';
import { AuthUserType } from '../user/user.types';
import { BranchModel, IBranch } from './branch.model';
import { CreateBranchType } from './branch.types';

export class BranchService {
  createBranch = async (user: AuthUserType, branchData: CreateBranchType) => {
    const { name, parentId } = branchData;

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

    let path = '';
    let _parentId = null;
    let isParent = true;

    if (parentId) {
      const parentBranch = await BranchModel.findById(parentId);
      if (!parentBranch) {
        throw new AppError(500, 'Branch create', `Дээд салбар олдсонгүй.`);
      }
      isParent = false;
      _parentId = parentId;
      path = parentBranch.isParent
        ? parentBranch.id
        : `${parentBranch.path}/${parentBranch._id}`;
    }

    // Create new branch
    const newBranch = new BranchModel({
      name,
      isParent: _parentId === null,
      parent: _parentId,
      path,
      createdBy: user.id,
    });

    await newBranch.save();
    // Update parent branch to indicate it has children
    return newBranch;
  };

  async getBranchWithChildren(id: string): Promise<IBranch[]> {
    const branch = await BranchModel.findById(id);
    if (!branch) throw new Error('Branch not found');

    const path = branch.isParent ? branch.id : `${branch.path}/${branch.id}`;
    const children = await BranchModel.find({
      path: { $regex: `^${path}` },
    });

    return [branch, ...children];
  }

  async getAll(): Promise<IBranch[]> {
    return BranchModel.find();
  }
}
