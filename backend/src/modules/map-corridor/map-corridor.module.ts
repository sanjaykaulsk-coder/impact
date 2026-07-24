import { Module } from '@nestjs/common';
import { MapCorridorController } from './map-corridor.controller';
import { MapCorridorService } from './map-corridor.service';

@Module({
  controllers: [MapCorridorController],
  providers: [MapCorridorService],
})
export class MapCorridorModule {}
