export type Role = 'super-admin' | 'admin' | 'user';

export enum SuperAdminActions {
  CREATE_BRANCH = 'create-branch',
}

export enum AdminActions {
  CREATE_TASK = 'create-task',
  REGISTER_USER = 'register-user',
  UPDATE_USER = 'update-user',
  CHANGE_USER_PASSWORD = 'change-user-password',
  VIEW_TASKS = 'view-tasks',
  ASSIGN_TASK = 'assign-task',
  AUDIT_TASK = 'audit-task',
  EVALUATE_TASK = 'evaluate-task',
  ATTACH_FILE_TASK = 'attach-file-task',
  NOTE_TASK = 'note-task',
}

export enum UserActions {
  CREATE_OWN_TASK = 'create-own-task',
  VIEW_OWN_TASKS = 'view-own-tasks',
  ASSIGN_TASK = 'assign-task',
  ATTACH_FILE_OWN_TASK = 'attach-file-own-task',
  NOTE_OWN_TASK = 'note-own-task',
}

export const RoleCapabilities: Record<Role, string[]> = {
  'super-admin': ['*'],
  admin: Object.values(AdminActions),
  user: Object.values(UserActions),
};
