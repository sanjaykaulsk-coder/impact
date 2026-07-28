import { Module } from '@nestjs/common';
import { GeocodingService } from '../../core/geo/geocoding.service';
import { PjpController } from './pjp.controller';
import { PjpService } from './pjp.service';

@Module({
  controllers: [PjpController],
  providers: [PjpService, GeocodingService],
  exports: [PjpService],
})
export class PjpModule {}
