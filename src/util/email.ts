import nodemailer from 'nodemailer';
import EnvVars from '@src/constants/EnvVars';
import { logger } from './log';

/** 创建邮件传输器 */
function createTransporter() {
  return nodemailer.createTransport({
    host: EnvVars.Email.Host,
    port: EnvVars.Email.Port,
    secure: EnvVars.Email.Secure,
    auth: {
      user: EnvVars.Email.User,
      pass: EnvVars.Email.Pass,
    },
  });
}

/** 发送验证码邮件 */
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: EnvVars.Email.From || EnvVars.Email.User,
      to,
      subject: '邮箱验证码 - MTExpress',
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">邮箱验证</h2>
          <p>您好！</p>
          <p>您的验证码是：</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${code}
          </div>
          <p style="color: #666; margin-top: 20px;">验证码有效期为 10 分钟，请尽快使用。</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`邮件发送成功: ${info.messageId} to ${to}`);
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

/** 生成 6 位随机验证码 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default {
  sendVerificationEmail,
  generateVerificationCode,
};
