import { AuditModel } from './audit.model';

export class AuditService {
  getAuditById = async (id: string) => {
    return await AuditModel.findById(id).populate('task checkedBy');
  };

  getAuditsByTask = async (taskId: string) => {
    return await AuditModel.find({ task: taskId })
      .populate(
        'checkedBy',
        '_id givenname surname position rank profileImageUrl'
      )
      .sort({ createdAt: 1 });
  };
}
