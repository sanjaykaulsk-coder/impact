import { IsEnum } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdatePreferredLanguageDto {
  @IsEnum(Language)
  preferredLanguage!: Language;
}
