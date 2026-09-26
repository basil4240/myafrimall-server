import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@UseGuards(AccessTokenGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  getAddresses(@ActiveUser() user: ActiveUserData) {
    return this.addressesService.getAddresses(user.sub);
  }

  @Post()
  createAddress(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.createAddress(user.sub, dto);
  }

  @Patch(':id')
  updateAddress(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(user.sub, id, dto);
  }

  @Delete(':id')
  deleteAddress(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
  ) {
    return this.addressesService.deleteAddress(user.sub, id);
  }

  @Patch(':id/default')
  setDefault(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
  ) {
    return this.addressesService.setDefault(user.sub, id);
  }
}
