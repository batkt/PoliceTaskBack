import { Request, Response } from 'express';
import { FileService } from './file.service';
import { AppError } from '../../middleware/error.middleware';

export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  uploadSingle = async (req: Request, res: Response) => {
    try {
      const authUser = req.user!;

      if (!req.file) {
        throw new AppError(400, 'File', 'Файл сонгоогүй байна.');
      }

      const result = await this.fileService.handleUpload(
        authUser,
        req.file,
        req.body.duration,
        req.body.usageType
      );

      res.status(201).json({
        code: 200,
        data: result,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Upload алдаа', error: err });
    }
  };
}
