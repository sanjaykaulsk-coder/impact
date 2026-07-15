import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

// Multipart form fields alongside the uploaded file — multer/class-transformer parse these as
// strings off the wire, so every field is explicitly coerced via @Type before validation.
export class UploadMediaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsDateString()
  capturedAt!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
