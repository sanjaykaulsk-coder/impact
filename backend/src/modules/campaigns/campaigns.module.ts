import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { MeController } from './me.controller';

@Module({
  controllers: [CampaignsController, MeController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
