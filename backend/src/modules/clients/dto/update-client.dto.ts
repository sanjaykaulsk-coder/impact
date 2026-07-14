import { IsEnum, IsHexColor, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  brandColorPrimary?: string;

  @IsOptional()
  @IsHexColor()
  brandColorSecondary?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
