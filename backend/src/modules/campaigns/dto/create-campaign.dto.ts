import { Language } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9_-]{2,48}$/, { message: 'code must be 2-48 uppercase letters/digits/-/_' })
  code!: string;

  @IsOptional()
  @IsEnum(Language)
  reportingLanguage?: Language;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  deviationToleranceMeters?: number;
}
