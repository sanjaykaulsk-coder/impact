import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FormArchetype } from '@prisma/client';

export class CreateFormTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // When set, the first draft is pre-populated from the named report-format archetype
  // (report-format-library §1) instead of starting empty.
  @IsOptional()
  @IsEnum(FormArchetype)
  archetype?: FormArchetype;
}
