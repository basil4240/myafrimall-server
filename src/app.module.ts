import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './common/config/app.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    CommonModule,
    AuthModule,
    UserModule,
    DashboardModule,
    ShipmentsModule,
    AddressesModule,
  ],
})
export class AppModule {}
