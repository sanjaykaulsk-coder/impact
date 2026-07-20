import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

// Spec §34's Attendance model, day-start/day-end only (build sequence S4.3) — a per-user,
// per-campaign, per-calendar-day marker, independent of any specific PJP activity. "Today" is the
// server's own local calendar day, the same boundary convention readiness.ts already uses
// elsewhere in this codebase — there is no per-user timezone concept yet anywhere in this app.
@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private startOfTomorrow(): Date {
    const start = this.startOfToday();
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  }

  async today(tenant: TenantContext, userId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const [dayStart, dayEnd] = await Promise.all([
        tx.attendance.findFirst({
          where: { campaignId: tenant.campaignId, userId, type: 'DAY_START', checkTime: { gte: this.startOfToday(), lt: this.startOfTomorrow() } },
        }),
        tx.attendance.findFirst({
          where: { campaignId: tenant.campaignId, userId, type: 'DAY_END', checkTime: { gte: this.startOfToday(), lt: this.startOfTomorrow() } },
        }),
      ]);
      return { dayStart, dayEnd };
    });
  }

  async dayStart(tenant: TenantContext, userId: string, dto: MarkAttendanceDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.attendance.findFirst({
        where: { campaignId: tenant.campaignId, userId, type: 'DAY_START', checkTime: { gte: this.startOfToday(), lt: this.startOfTomorrow() } },
      });
      if (existing) throw new BadRequestException('You have already started your day today');

      return tx.attendance.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          userId,
          type: 'DAY_START',
          checkTime: new Date(),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    });
  }

  async dayEnd(tenant: TenantContext, userId: string, dto: MarkAttendanceDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const start = await tx.attendance.findFirst({
        where: { campaignId: tenant.campaignId, userId, type: 'DAY_START', checkTime: { gte: this.startOfToday(), lt: this.startOfTomorrow() } },
      });
      if (!start) throw new BadRequestException('Start your day before ending it');

      const existing = await tx.attendance.findFirst({
        where: { campaignId: tenant.campaignId, userId, type: 'DAY_END', checkTime: { gte: this.startOfToday(), lt: this.startOfTomorrow() } },
      });
      if (existing) throw new BadRequestException('You have already ended your day today');

      return tx.attendance.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          userId,
          type: 'DAY_END',
          checkTime: new Date(),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    });
  }
}
