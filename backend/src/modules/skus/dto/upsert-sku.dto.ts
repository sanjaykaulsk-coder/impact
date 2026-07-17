import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateSkuDto {
  @IsString()
  @MinLength(1)
  skuCode!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  variantLabel?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  packSize?: string;
}

export class UpdateSkuDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  skuCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  variantLabel?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  packSize?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
