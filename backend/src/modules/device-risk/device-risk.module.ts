import { Module } from '@nestjs/common';
import { DeviceRiskService } from './device-risk.service';

@Module({
  providers: [DeviceRiskService],
  exports: [DeviceRiskService],
})
export class DeviceRiskModule {}
