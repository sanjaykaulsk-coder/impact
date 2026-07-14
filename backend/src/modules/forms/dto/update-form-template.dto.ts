import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFormTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
