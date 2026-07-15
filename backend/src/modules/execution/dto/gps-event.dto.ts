import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

// Shared shape for check-in and check-out — both are "here's my GPS position right now."
export class GpsEventDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  accuracyMeters?: number;

  @IsDateString()
  deviceTimestamp!: string;
}
