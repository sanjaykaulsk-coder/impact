import { IsUUID } from 'class-validator';

export class ApplyTemplateDto {
  @IsUUID()
  activityTemplateId!: string;
}
