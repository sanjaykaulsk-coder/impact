import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DeviationType } from '@prisma/client';

export class SubmitDeviationRequestDto {
  @IsEnum(DeviationType)
  deviationType!: DeviationType;

  // Required — spec §14: "user selects reason + remarks" is how a warned-but-continuing deviation
  // gets explained, not optional context.
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @IsOptional()
  @IsNumber()
  distanceMeters?: number;
}
