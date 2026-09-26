import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { HashingService } from '../common/services/hashing.service';
import { HelperService } from '../common/services/helper.service';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../common/services/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly helper: HelperService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      if (!exists.isVerified) {
        throw new ConflictException('Email not verified. Please verify your email.');
      }
      throw new ConflictException('Email already in use');
    }

    const password = await this.hashing.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        password,
      },
    });

    await this.createAndSendOtp(user.id, user.email, OtpType.REGISTRATION);

    return { message: 'Registration successful. Check your email for the verification code.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        type: OtpType.REGISTRATION,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || otpRecord.token !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await Promise.all([
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    const tokens = await this.helper.generateJwtTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      message: 'Email verified successfully',
      data: { ...tokens, user: this.formatUser(user) },
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email already verified');

    await this.createAndSendOtp(user.id, user.email, OtpType.REGISTRATION);
    return { message: 'Verification code sent' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.hashing.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      throw new ConflictException('Email not verified. Please verify your email.');
    }

    const tokens = await this.helper.generateJwtTokens({
      sub: user.id,
      email: user.email,
    });

    return {
      message: 'Login successful',
      data: { ...tokens, user: this.formatUser(user) },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (user) {
      await this.createAndSendOtp(user.id, user.email, OtpType.PASSWORD_RESET);
    }
    return { message: 'If that email exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new BadRequestException('Invalid request');

    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        type: OtpType.PASSWORD_RESET,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || otpRecord.token !== dto.otp) {
      throw new BadRequestException('Invalid or expired code');
    }

    const password = await this.hashing.hash(dto.password);
    await Promise.all([
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { password },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.helper.verifyRefreshToken(dto.refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('User not found');

      const tokens = await this.helper.generateJwtTokens({
        sub: user.id,
        email: user.email,
      });
      return { message: 'Tokens refreshed', data: tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async createAndSendOtp(
    userId: string,
    email: string,
    type: OtpType,
  ) {
    const otp = this.helper.generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpToken.create({
      data: { token: otp, type, expiresAt, userId },
    });

    const subject =
      type === OtpType.REGISTRATION
        ? 'Verify your Myafrimall account'
        : 'Reset your Myafrimall password';

    await this.mail.sendOtp(email, otp, subject);
  }

  private formatUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    isVerified: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}
