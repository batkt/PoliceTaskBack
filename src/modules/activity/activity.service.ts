import { TaskActivityModel, TaskActivityType } from './activity.model';
import { Types } from 'mongoose';

export const logTaskActivity = async (
  taskId: Types.ObjectId | string,
  userId: Types.ObjectId | string,
  type: TaskActivityType,
  message?: string
) => {
  if (!type) {
    return null;
  }
  return TaskActivityModel.create({ taskId, userId, type, message });
};

export const generateActivityMessage = (
  type: TaskActivityType,
  actorName?: string
) => {
  switch (type) {
    case 'created':
      return `Даалгавар үүсгэлээ`;
    case 'assigned':
      return `Даалгаврыг "${actorName}"-д хуваариллаа`;
    case 'commented':
      return `Тэмдэглэл бичсэн`;
    case 'status-changed':
      return `Даалгавар "${actorName}" төлөвт шилжлээ`;
    case 'file-attached':
      return `Файл хавсаргасан`;
    case 'file-deleted':
      return `Файл устгасан`;
    case 'audited':
      return `Даалгаврыг хянасан`;
    case 'evaluated':
      return `Даалгаврт үнэлгээ өгсөн`;
    default:
      return `${actorName} үйлдэл хийв`;
  }
};
