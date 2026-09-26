import { Injectable } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { HelperService } from '../common/services/helper.service';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
  ) {}

  async getOverview(userId: string, period: string) {
    const { start, prev } = this.getPeriodDates(period);

    const [
      currentShipments,
      prevShipments,
      wallet,
    ] = await Promise.all([
      this.prisma.shipment.findMany({
        where: { userId, createdAt: { gte: start } },
        select: { id: true, serviceType: true },
      }),
      this.prisma.shipment.findMany({
        where: { userId, createdAt: { gte: prev, lt: start } },
        select: { id: true, serviceType: true },
      }),
      this.prisma.wallet.findUnique({ where: { userId } }),
    ]);

    const totalShipments = currentShipments.length;
    const prevTotal = prevShipments.length;

    const totalExports = currentShipments.filter(
      (s) => s.serviceType === 'EXPRESS',
    ).length;
    const prevExports = prevShipments.filter(
      (s) => s.serviceType === 'EXPRESS',
    ).length;

    const totalImports = currentShipments.filter(
      (s) => s.serviceType === 'ECONOMY',
    ).length;
    const prevImports = prevShipments.filter(
      (s) => s.serviceType === 'ECONOMY',
    ).length;

    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    return {
      message: 'Overview fetched',
      data: {
        balance: wallet?.balance ?? 0,
        stats: {
          totalShipments,
          totalExports,
          totalImports,
          shipmentsChange: pct(totalShipments, prevTotal),
          exportsChange: pct(totalExports, prevExports),
          importsChange: pct(totalImports, prevImports),
          vsLastPeriod: prevTotal,
        },
      },
    };
  }

  private getPeriodDates(period: string) {
    const now = new Date();
    let start: Date;
    let prev: Date;

    if (period === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prev = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      prev = new Date(now.getFullYear() - 1, 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    return { start, prev };
  }
}
