export interface ICreateTaskInput {
  priority?: 'low' | 'medium' | 'high';
  title: string;
  description?: string;
  assignees: string[];
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
