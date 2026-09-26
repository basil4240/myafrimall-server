import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class HelperService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {}

  async generateJwtTokens(payload: ActiveUserData) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtCfg.secret,
        audience: this.jwtCfg.tokenAudience,
        issuer: this.jwtCfg.tokenIssuer,
        expiresIn: this.jwtCfg.accessTokenTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtCfg.refreshSecret,
        audience: this.jwtCfg.tokenAudience,
        issuer: this.jwtCfg.tokenIssuer,
        expiresIn: this.jwtCfg.refreshTokenTtl,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<ActiveUserData> {
    return this.jwtService.verifyAsync<ActiveUserData>(token, {
      secret: this.jwtCfg.refreshSecret,
      audience: this.jwtCfg.tokenAudience,
      issuer: this.jwtCfg.tokenIssuer,
    });
  }

  generateOtp(length = 6): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  generateTrackingId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'MAM-';
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  calculatePaginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit) || 0;
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
