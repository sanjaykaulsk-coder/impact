import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';

export class DeviceInfoDto {
  @IsString()
  fingerprint!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class VerifyOtpDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device!: DeviceInfoDto;
}
