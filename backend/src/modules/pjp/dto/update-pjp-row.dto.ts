import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

// Edits mutable, non-status fields on a row. Date/status changes go through the dedicated
// postpone/reschedule/cancel endpoints instead, so every date-affecting action is captured with
// its own labeled audit-log entry rather than folded into a generic "edited" one.
export class UpdatePjpRowDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @IsOptional()
  @IsNumber()
  plannedSequence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
