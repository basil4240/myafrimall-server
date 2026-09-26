import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { DashboardService } from './dashboard.service';

@UseGuards(AccessTokenGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @ActiveUser() user: ActiveUserData,
    @Query('period') period = 'month',
  ) {
    return this.dashboardService.getOverview(user.sub, period);
  }
}
