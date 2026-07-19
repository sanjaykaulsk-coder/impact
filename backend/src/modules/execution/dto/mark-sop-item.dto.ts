import { IsEnum, IsOptional, IsString } from 'class-validator';

export class MarkSopItemDto {
  @IsEnum(['COMPLETED', 'NOT_APPLICABLE'])
  status!: 'COMPLETED' | 'NOT_APPLICABLE';

  @IsOptional()
  @IsString()
  remarks?: string;
}
