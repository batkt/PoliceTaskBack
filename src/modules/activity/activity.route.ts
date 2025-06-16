import { Router } from 'express';
import { TaskActivityModel } from './activity.model';

const router = Router();

router.get('/:id/activities', async (req, res) => {
  const { id } = req.params;

  const activities = await TaskActivityModel.find({ taskId: id })
    .populate('userId', '_id givenname surname profileImageUrl rank position')
    .sort({ createdAt: 1 });

  res.send({
    code: 200,
    data: activities,
  });
});

export { router as activityRouter };
