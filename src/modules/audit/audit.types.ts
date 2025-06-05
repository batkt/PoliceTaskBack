export enum AuditResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IAuditInput {
  taskId: string;
  comments: string;
  result: 'approved' | 'rejected';
}
