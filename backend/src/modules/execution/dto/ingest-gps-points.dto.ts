import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

// One fix from the device's continuous location stream — same shape as GpsEventDto's lat/lng/
// accuracy/timestamp, plus the fields only an ongoing trace needs (speed, mock-location signal).
export class GpsPointDto {
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

  @IsOptional()
  @IsNumber()
  speedKmh?: number;

  @IsOptional()
  @IsBoolean()
  isMockLocationSuspected?: boolean;

  @IsDateString()
  recordedAt!: string;
}

export class IngestGpsPointsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  points!: GpsPointDto[];
}
