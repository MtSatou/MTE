import { Router } from 'express';
import UploadRoutes from './uploadRoutes';
import auth from '@src/routes/middleware/auth';
import upload from '@src/util/upload';

export const Base = '/upload';

const router = Router();

// 所有上传接口需要登录鉴权
router.use(auth);

// 上传文件（使用 multer 中间件处理 multipart/form-data）
router.post('/', upload.single('file'), UploadRoutes.uploadFile);

// 获取我的上传记录列表
router.get('/list', UploadRoutes.getMyUploads);

// 获取单个上传记录
router.get('/:id', UploadRoutes.getUploadById);

// 删除上传记录及文件
router.delete('/:id', UploadRoutes.deleteUpload);

export default router;
