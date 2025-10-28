import { AppError } from '../../middleware/error.middleware';
import { getAccessibleBranches } from '../../middleware/permission.middleware';
import { TaskModel } from '../task-v2/task.model';
import { AuthUserType } from '../user/user.types';
import { NoteModel } from './note.model';
import { INoteInput } from './note.types';

export class NoteService {
  removeNote = async (
    authUser: AuthUserType,
    {
      id,
    }: {
      id: string;
    }
  ) => {
    const note = await NoteModel.findById(id);
    if (!note) {
      throw new AppError(404, 'Remove note', 'Тэмдэглэл олдсонгүй.');
    }
    if (note.createdBy.toString() !== authUser.id) {
      throw new AppError(
        403,
        'Remove note',
        'Та энэ үйлдлийг хийх эрхгүй байна.'
      );
    }

    await note.deleteOne();

    return true;
  };

  getTaskNotes = async (taskId: string) => {
    const notes = await NoteModel.find({
      task: taskId,
    })
      .populate(
        'createdBy',
        '_id givenname surname profileImageUrl rank position'
      )
      .lean();

    return notes;
  };
}
