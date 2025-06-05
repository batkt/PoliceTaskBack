export enum NotificationType {
  TASK = 'task',
  MESSAGE = 'message',
  SYSTEM_MESSSAGE = 'system',
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  taskId?: string;
}
