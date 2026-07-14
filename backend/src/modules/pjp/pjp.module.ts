import { Module } from '@nestjs/common';
import { PjpController } from './pjp.controller';
import { PjpService } from './pjp.service';

@Module({
  controllers: [PjpController],
  providers: [PjpService],
  exports: [PjpService],
})
export class PjpModule {}
