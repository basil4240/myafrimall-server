import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceType } from '@prisma/client';
import { HelperService } from '../common/services/helper.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { PaginateShipmentsDto } from './dto/paginate-shipments.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
  ) {}

  async getShipments(userId: string, dto: PaginateShipmentsDto) {
    const { page, limit } = dto;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shipment.count({ where: { userId } }),
    ]);

    return {
      message: 'Shipments fetched',
      data: items.map(this.formatShipment),
      pagination: this.helper.calculatePaginationMeta(total, page, limit),
    };
  }

  async createShipment(userId: string, dto: CreateShipmentDto) {
    const trackingId = this.helper.generateTrackingId();
    const serviceType = this.parseServiceType(dto.serviceType);

    const shipment = await this.prisma.shipment.create({
      data: {
        trackingId,
        senderName: dto.senderName,
        senderLocation: dto.pickupAddress,
        receiverName: dto.receiverName,
        receiverLocation: dto.deliveryAddress,
        weight: dto.weight,
        description: dto.description,
        serviceType,
        userId,
      },
    });

    return { message: 'Shipment created', data: this.formatShipment(shipment) };
  }

  async updateShipment(userId: string, id: string, dto: UpdateShipmentDto) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        ...(dto.senderName && { senderName: dto.senderName }),
        ...(dto.pickupAddress && { senderLocation: dto.pickupAddress }),
        ...(dto.receiverName && { receiverName: dto.receiverName }),
        ...(dto.deliveryAddress && { receiverLocation: dto.deliveryAddress }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.serviceType && {
          serviceType: this.parseServiceType(dto.serviceType),
        }),
      },
    });

    return { message: 'Shipment updated', data: this.formatShipment(updated) };
  }

  async deleteShipment(userId: string, id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.userId !== userId) throw new ForbiddenException();

    await this.prisma.shipment.delete({ where: { id } });
    return { message: 'Shipment deleted' };
  }

  private formatShipment(s: {
    id: string;
    trackingId: string;
    senderName: string;
    senderLocation: string;
    receiverName: string;
    receiverLocation: string;
    weight: number;
    description: string | null;
    serviceType: ServiceType;
    status: string;
    amount: number;
    currency: string;
    processingTime: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: s.id,
      trackingId: s.trackingId,
      sender: { name: s.senderName, location: s.senderLocation },
      receiver: { name: s.receiverName, location: s.receiverLocation },
      weight: s.weight,
      description: s.description,
      serviceType: s.serviceType,
      status: s.status.toLowerCase(),
      isPaid: s.status === 'PAID',
      amount: s.amount,
      currency: s.currency,
      processingTime: s.processingTime,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private parseServiceType(value?: string): ServiceType {
    const map: Record<string, ServiceType> = {
      express: ServiceType.EXPRESS,
      economy: ServiceType.ECONOMY,
      standard: ServiceType.STANDARD,
    };
    return map[value?.toLowerCase() ?? ''] ?? ServiceType.STANDARD;
  }
}
