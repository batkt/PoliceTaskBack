import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FileController } from './file.controller';

const router = Router();
const fileController = new FileController();

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../../uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), fileController.uploadSingle);

export { router as fileRouter };
