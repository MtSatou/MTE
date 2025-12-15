import { Router } from 'express';
import VerificationRoutes from './verificationRoutes';
import { authLimiter } from '@src/util/rate-limit';

export const Base = '/verification';

const router = Router();

// 发送验证码（无需鉴权）
router.post('/send', authLimiter, VerificationRoutes.sendCode);

// 验证验证码（无需鉴权）
router.post('/verify', VerificationRoutes.verifyCode);

export default router;
