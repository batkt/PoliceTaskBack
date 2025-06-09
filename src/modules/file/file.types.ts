export interface UploadedFileResponse {
  filename: string;
  url: string;
}

export enum FileUsageType {
  ATTACHMENT = 'attachment',
  PROFILE = 'profile',
}
