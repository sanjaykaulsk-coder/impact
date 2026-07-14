import { ForbiddenException, Injectable } from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DeviceInfoDto } from './dto/verify-otp.dto';

/**
 * Device registration + binding (spec §7): a user's first device is auto-approved; beyond
 * MAX_ACTIVE_DEVICES_PER_USER, a new device is created PENDING_APPROVAL and login is refused with
 * a specific, distinguishable error so the app can show "device pending approval" rather than a
 * generic failure. The actual supervisor-approval action is a feature module beyond Phase C's
 * foundation scope (see docs/STATE.md) — the state machine and data model exist today so that
 * module is pure configuration/UI work, not a schema change.
 */
@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  private get maxActiveDevices(): number {
    return Number(process.env.MAX_ACTIVE_DEVICES_PER_USER ?? '2');
  }

  async resolveForLogin(userId: string, info: DeviceInfoDto) {
    const existing = await this.prisma.device.findUnique({
      where: { userId_deviceFingerprint: { userId, deviceFingerprint: info.fingerprint } },
    });

    if (existing) {
      if (existing.status === DeviceStatus.BLOCKED) {
        throw new ForbiddenException('This device has been blocked. Contact your administrator.');
      }
      if (existing.status === DeviceStatus.PENDING_APPROVAL) {
        throw new ForbiddenException('This device is awaiting approval before it can be used.');
      }
      return this.prisma.device.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          deviceModel: info.model ?? existing.deviceModel,
          osVersion: info.osVersion ?? existing.osVersion,
          appVersion: info.appVersion ?? existing.appVersion,
        },
      });
    }

    const activeCount = await this.prisma.device.count({
      where: { userId, status: DeviceStatus.ACTIVE },
    });
    const status = activeCount < this.maxActiveDevices ? DeviceStatus.ACTIVE : DeviceStatus.PENDING_APPROVAL;

    const device = await this.prisma.device.create({
      data: {
        userId,
        deviceFingerprint: info.fingerprint,
        deviceModel: info.model,
        osVersion: info.osVersion,
        appVersion: info.appVersion,
        status,
      },
    });

    if (status === DeviceStatus.PENDING_APPROVAL) {
      throw new ForbiddenException(
        `Maximum of ${this.maxActiveDevices} active device(s) already reached for this account. ` +
          'This new device has been registered but needs approval before it can be used.',
      );
    }

    return device;
  }
}
