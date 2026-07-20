import { Module } from '@nestjs/common';
import { DeviceRiskModule } from '../device-risk/device-risk.module';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';

@Module({
  imports: [DeviceRiskModule],
  controllers: [ExecutionController],
  providers: [ExecutionService],
})
export class ExecutionModule {}
