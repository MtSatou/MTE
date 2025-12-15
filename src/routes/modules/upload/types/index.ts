export interface IUploadedFile {
  id: number;
  /** 原始文件名 */
  originalName: string;
  /** 实际存储的文件名 */
  storedName: string;
  /** 文件相对路径 */
  filePath: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** MIME 类型 */
  mimeType: string;
  /** 上传用户 id */
  userId: number;
  /** 上传时间 */
  uploadTime: string;
}
