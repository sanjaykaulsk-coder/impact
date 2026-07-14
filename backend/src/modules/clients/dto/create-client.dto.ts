import { IsHexColor, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9_-]{2,24}$/, { message: 'code must be 2-24 uppercase letters/digits/-/_' })
  code!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  brandColorPrimary?: string;

  @IsOptional()
  @IsHexColor()
  brandColorSecondary?: string;
}
