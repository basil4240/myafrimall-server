import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import smtpConfig from '../config/smtp.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(smtpConfig.KEY)
    private readonly smtp: ConfigType<typeof smtpConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }

  async sendOtp(email: string, otp: string, subject: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.smtp.from,
        to: email,
        subject,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
    }
  }
}
