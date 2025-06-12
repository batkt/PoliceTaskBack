import { Types } from 'mongoose';
import { BranchModel } from '../modules/branch/branch.model';
import { FileModel } from '../modules/file/file.model';

export const fileModelChange = async () => {
  const res = await FileModel.updateMany(
    {
      task: {
        $ne: null,
      },
    },
    {
      $set: {
        isActive: true,
      },
    }
  );

  console.log(res.modifiedCount + ' files changed.');
};

/**
 * Root салбаруудаас эхлэн бүх branch-уудын path-г дахин тооцоолж шинэчилнэ
 */
export const rebuildBranchPaths = async () => {
  const allBranches = await BranchModel.find().lean();

  // id -> branch map
  const branchMap = new Map<string, (typeof allBranches)[number]>();
  allBranches.forEach((b) => branchMap.set(b._id.toString(), b));

  // parentId -> [childId]
  const childrenMap = new Map<string, string[]>();
  for (const b of allBranches) {
    if (b.parent) {
      const parentId = b.parent.toString();
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(b._id.toString());
    }
  }

  const updates: { updateOne: { filter: any; update: any } }[] = [];

  // ↓ recursive path update function
  const computePaths = (currentId: string, currentPath: string) => {
    const newPath = currentPath ? `${currentPath}/${currentId}` : currentId;
    updates.push({
      updateOne: {
        filter: { _id: currentId },
        update: { $set: { path: currentPath } }, // 🔹 path = currentPath
      },
    });

    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      computePaths(childId, newPath); // 🔹 child-ууддаа newPath дамжуулна
    }
  };

  // 🔹 isParent: true root-уудаас эхэлнэ
  for (const branch of allBranches) {
    if (branch.isParent) {
      computePaths(branch._id.toString(), ''); // root → path = ""
    }
  }

  if (updates.length) {
    await BranchModel.bulkWrite(updates);
    console.log(
      `✅ Branch path бүх салбаруудад шинэчлэгдлээ (${updates.length})`
    );
  } else {
    console.log('⚠️ Шинэчлэх зүйл олдсонгүй');
  }
};
