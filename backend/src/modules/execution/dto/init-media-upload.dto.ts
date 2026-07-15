import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { MAX_PHOTO_BYTES } from '../execution.constants';

// Starts (or resumes — see ExecutionService.initMediaUpload) a chunked upload session. The client
// computes the file's sha256 up front so the server can both verify integrity at /complete and
// recognize a resumed session for content it's already partway through receiving.
export class InitMediaUploadDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  sha256Hash!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_PHOTO_BYTES)
  sizeBytes!: number;

  @IsString()
  mimeType!: string;

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
