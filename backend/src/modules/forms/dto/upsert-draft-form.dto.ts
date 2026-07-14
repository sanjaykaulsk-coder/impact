import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ConditionalAction, FieldType } from '@prisma/client';

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class FormQuestionDto {
  // Client-generated temporary key so ConditionalRuleDto can reference a question within the same
  // payload before it has a real database id — the whole draft tree is replaced on every save
  // (spec's versioning skeleton keeps this simple rather than exposing granular per-question CRUD).
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsEnum(FieldType)
  fieldType!: FieldType;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsBoolean()
  isMandatory!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsObject()
  controlsJson?: Record<string, unknown>;
}

export class FormSectionDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormQuestionDto)
  questions!: FormQuestionDto[];
}

export class ConditionalRuleDto {
  @IsString()
  @IsNotEmpty()
  triggerQuestionKey!: string;

  // Deliberately untyped beyond "present": a trigger value can legitimately be a boolean
  // (YES_NO), a string (dropdown value) or a number, not only an object.
  @IsNotEmpty()
  triggerValueJson!: unknown;

  @IsEnum(ConditionalAction)
  action!: ConditionalAction;

  @IsString()
  @IsNotEmpty()
  targetQuestionKey!: string;
}

export class UpsertDraftFormDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormSectionDto)
  sections!: FormSectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionalRuleDto)
  conditionalRules?: ConditionalRuleDto[];
}
