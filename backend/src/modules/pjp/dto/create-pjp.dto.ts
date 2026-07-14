import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

// Deliberately loose: every row field is optional/untyped-strict here. A single malformed row
// must never 400 the whole upload — real requiredness/shape checks run row-by-row in
// PjpService.validateRow so a bad row can be reported and skipped instead of blocking the batch
// (the "invalid-row detection" the build sequence calls for).
export class PjpRowInputDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  stateName?: string;

  @IsOptional()
  @IsString()
  districtName?: string;

  @IsOptional()
  @IsString()
  tehsilName?: string;

  @IsOptional()
  @IsString()
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
}

export class CreatePjpDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PjpRowInputDto)
  rows!: PjpRowInputDto[];
}
