import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import smtpConfig from './config/smtp.config';
import { AccessTokenGuard } from './guards/access-token.guard';
import { BcryptService } from './services/bcrypt.service';
import { HashingService } from './services/hashing.service';
import { HelperService } from './services/helper.service';
import { MailService } from './services/mail.service';
import { PrismaService } from './services/prisma.service';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(smtpConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  providers: [
    PrismaService,
    HelperService,
    MailService,
    AccessTokenGuard,
    { provide: HashingService, useClass: BcryptService },
  ],
  exports: [
    PrismaService,
    HelperService,
    MailService,
    AccessTokenGuard,
    HashingService,
    JwtModule,
    ConfigModule,
  ],
})
export class CommonModule {}
