import fs from 'fs/promises';
import path from 'path';
import { FileModel } from './file.model';
import { AuthUserType } from '../user/user.types';
import { FileUsageType } from './file.types';

export class FileService {
  public generateFileUrl(filename: string): string {
    const url = `${process.env.BASE_URL}/uploads/${filename}`;
    return url;
  }

  handleUpload = async (
    user: AuthUserType,
    file: Express.Multer.File,
    duration?: number,
    usageType?: FileUsageType
  ) => {
    const url = this.generateFileUrl(file.filename);

    const uploadedFile = await FileModel.create({
      originalName: file.originalname,
      filename: file.filename,
      url,
      duration,
      mimetype: file.mimetype,
      usageType,
      size: file.size,
      uploadedBy: user.id, // хэрвээ authentication байгаа бол
    });

    const result = await FileModel.findById(uploadedFile.id).lean();
    return result;
  };

  async assignFilesToTask(fileIds: string[], taskId: string) {
    if (!Array.isArray(fileIds) || !fileIds.length) {
      throw new Error('fileIds хоосон байна');
    }

    await FileModel.updateMany(
      { _id: { $in: fileIds } },
      { $set: { task: taskId } }
    );
  }

  async cleanupUnusedFiles() {
    console.log('🧹 Cron ажиллаа: Ашиглаагүй файлуудыг цэвэрлэж байна...');

    try {
      const unlinkedFiles = await FileModel.find({ isActive: false });
      for (const file of unlinkedFiles) {
        const filePath = path.join(__dirname, '../../uploads', file.filename);

        try {
          await fs.unlink(filePath);
        } catch (err) {}

        await FileModel.findByIdAndDelete(file._id);
      }

      console.log(`✅ Нийт ${unlinkedFiles.length} устахаар байна.`);
    } catch (err) {
      console.error('❌ Файл устгалын үед алдаа:', err);
    }
  }
}
