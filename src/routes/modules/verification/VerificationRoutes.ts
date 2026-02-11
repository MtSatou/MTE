import { sendVerificationEmail, generateVerificationCode } from '@src/util/email';
import RedisCacheService from '@src/services/RedisCacheService';
import { CACHE_KEYS } from '@src/constants/CacheKeys';

/** 发送验证码：POST /verification/send  body: { email } */
async function sendCode(req: IReq<never, never, { email: string }>, res: IRes) {
  const email = String(req.body.email || '').trim();

  if (!email) {
    return res.error('邮箱不能为空');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.error('邮箱格式不正确');
  }

  // 生成验证码
  const code = generateVerificationCode();

  try {
    // 发送邮件
    const sent = await sendVerificationEmail(email, code);
    if (!sent) {
      return res.error('邮件发送失败，请稍后重试');
    }

    // 缓存验证码到Redis
    await RedisCacheService.set(CACHE_KEYS.VERIFICATION_CODE(email), code, { ttl: 600 });

    return res.success({
      email,
    }, '验证码已发送，请查收邮件');
  } catch (e) {
    return res.error('发送失败');
  }
}

/** 验证验证码：POST /verification/verify  body: { email, code } */
async function verifyCode(req: IReq<never, never, { email: string; code: string }>, res: IRes) {
  const email = req.body.email.trim();
  const code = req.body.code.trim();

  if (!email || !code) {
    return res.error('邮箱和验证码不能为空');
  }

  let isValid = false;
  const cachedCode = await RedisCacheService.get(CACHE_KEYS.VERIFICATION_CODE(email));

  if (cachedCode && cachedCode === code) {
    isValid = true;
    await RedisCacheService.del(CACHE_KEYS.VERIFICATION_CODE(email));
  } else {
    return res.error('验证码错误或已过期');
  }

  if (isValid) {
    return res.success({
      valid: true,
    }, '验证成功');
  } else {
    return res.error('验证码错误或已过期');
  }
}

export default {
  sendCode,
  verifyCode,
} as const;
