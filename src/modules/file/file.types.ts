export interface UploadedFileResponse {
  filename: string;
  url: string;
}

export enum FileUsageType {
  PROFILE = 'profile',
  ATTACHMENT = 'attachment',
}
