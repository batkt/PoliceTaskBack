export interface ICreateTaskInput {
  priority?: 'low' | 'medium' | 'high';
  title: string;
  formTemplateId: string;
  branchId: string;
  description?: string;
  assignee: string;
  supervisors: string[];
  startDate: Date;
  dueDate?: Date;
  fileIds?: string[]; // optional
}

export enum TaskStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface IFieldEntry {
  key: string;
  value: any;
}
