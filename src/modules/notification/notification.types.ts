export type NotificationType = 'job' | 'message' | 'system';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  taskId?: string;
}
