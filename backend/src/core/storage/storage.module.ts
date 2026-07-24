import { Global, Module } from '@nestjs/common';
import { MapTileService } from './map-tile.service';
import { MediaStorageService } from './media-storage.service';

@Global()
@Module({
  providers: [MediaStorageService, MapTileService],
  exports: [MediaStorageService, MapTileService],
})
export class StorageModule {}
