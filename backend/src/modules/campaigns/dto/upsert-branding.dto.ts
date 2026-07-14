import { IsHexColor, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertBrandingDto {
  @IsHexColor()
  primaryColor!: string;

  @IsHexColor()
  secondaryColor!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  campaignLogoUrl?: string;

  @IsOptional()
  @IsUrl()
  homeBannerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructionsText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  escalationContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  escalationContactPhone?: string;
}
