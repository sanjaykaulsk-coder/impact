import { CampaignStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class TransitionCampaignDto {
  @IsEnum(CampaignStatus)
  toStatus!: CampaignStatus;
}
