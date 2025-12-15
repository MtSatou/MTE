import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import UploadRepo from '@src/repos/modules/uploadRepo';
import path from 'path';
import fs from 'fs';
import baseUrl from '@src/util/baseUrl';

/** 上传文件：POST /upload  (multipart/form-data, field: file) */
async function uploadFile(req: IReq, res: IRes) {
  const auth = res.locals.auth;
  const userId = Number(auth.id);

  if (!req.file) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '未上传文件' });
  }

  try {
    // 获取文件信息
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const storedName = req.file.filename;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const filePath = `/uploads/${storedName}`;

    // 保存上传记录到数据库
    const record = await UploadRepo.add({
      originalName,
      storedName,
      filePath,
      fileSize,
      mimeType,
      userId,
      uploadTime: new Date().toLocaleString(),
    });

    return res.status(HttpStatusCodes.CREATED).json({
      id: record.id,
      originalName: record.originalName,
      storedName: record.storedName,
      filePath: record.filePath,
      fileSize: record.fileSize,
      mimeType: record.mimeType,
      uploadTime: record.uploadTime,
    });
  } catch (e) {
    return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      message: String(e) || '上传失败',
    });
  }
}

/** 获取我的上传记录：GET /upload/list */
async function getMyUploads(req: IReq, res: IRes) {
  const auth = res.locals.auth;
  const userId = Number(auth?.id);

  const uploads = await UploadRepo.getAllByUserId(userId);
  return res.status(HttpStatusCodes.OK).json({ uploads });
}

/** 获取单个上传记录：GET /upload/:id */
async function getUploadById(req: IReq, res: IRes) {
  const auth = res.locals.auth;
  const userId = auth.id;
  const id = Number(req.params.id);

  if (!id) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '缺少 id' });
  }

  const record = await UploadRepo.getById(id);
  if (!record) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ message: '文件记录不存在' });
  }

  // 只能查看自己的上传记录
  if (Number(record.userId) !== userId) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无权访问' });
  }

  return res.status(HttpStatusCodes.OK).json({ upload: record });
}

/** 删除上传记录及文件：DELETE /upload/:id */
async function deleteUpload(req: IReq, res: IRes) {
  const auth = res.locals.auth;
  const userId = auth.id;
  const id = Number(req.params.id);

  if (!id) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ message: '缺少 id' });
  }

  const record = await UploadRepo.getById(id);
  if (!record) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ message: '文件记录不存在' });
  }

  // 只能删除自己的上传
  if (Number(record.userId) !== userId) {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ message: '无权删除' });
  }

  // 删除物理文件
  const filePath = path.join(__dirname, baseUrl + 'uploads', record.storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // 删除数据库记录
  const ok = await UploadRepo.deleteById(id);
  return res.status(ok ? HttpStatusCodes.OK : HttpStatusCodes.NOT_FOUND).json({
    message: ok ? '删除成功' : '删除失败',
  });
}

export default {
  uploadFile,
  getMyUploads,
  getUploadById,
  deleteUpload,
} as const;
