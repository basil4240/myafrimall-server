import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

@UseGuards(AccessTokenGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@ActiveUser() user: ActiveUserData) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Patch('change-password')
  changePassword(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.sub, dto);
  }
}
