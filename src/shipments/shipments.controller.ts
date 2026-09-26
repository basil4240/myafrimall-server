import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { PaginateShipmentsDto } from './dto/paginate-shipments.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentsService } from './shipments.service';

@UseGuards(AccessTokenGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  getShipments(
    @ActiveUser() user: ActiveUserData,
    @Query() dto: PaginateShipmentsDto,
  ) {
    return this.shipmentsService.getShipments(user.sub, dto);
  }

  @Post()
  createShipment(
    @ActiveUser() user: ActiveUserData,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.createShipment(user.sub, dto);
  }

  @Patch(':id')
  updateShipment(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.updateShipment(user.sub, id, dto);
  }

  @Delete(':id')
  deleteShipment(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.deleteShipment(user.sub, id);
  }
}
