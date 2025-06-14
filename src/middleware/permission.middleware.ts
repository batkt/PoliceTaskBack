import { RoleCapabilities } from '../types/roles';
import { BranchService } from '../modules/branch/branch.service';
import { AuthUserType } from '../modules/user/user.types';

async function getAccessibleBranches(user: AuthUserType): Promise<string[]> {
  const branchService = new BranchService();
  if (user.role === 'super-admin') return ['*'];
  const branches = await branchService.getBranchWithChildren(user.branchId);

  const branchIds = branches.map((branch) => branch.id);

  return Array.from(new Set(branchIds));
}

function canAccess(user: AuthUserType, action: string): boolean {
  const capabilities = RoleCapabilities[user.role] || [];

  const canDo = capabilities.includes(action) || capabilities.includes('*');

  if (canDo) {
    return true;
  }
  return false;
}

export { canAccess, getAccessibleBranches };
