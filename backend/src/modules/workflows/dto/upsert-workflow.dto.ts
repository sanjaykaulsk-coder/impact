import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SopChecklistItemInputDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsBoolean()
  isMandatory!: boolean;
}

export class MilestoneInputDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(0)
  order!: number;

  // A PUBLISHED FormVersion id belonging to this campaign — never a draft (spec §10's frozen
  // versioning) and never another campaign's form (checked server-side).
  @IsOptional()
  @IsUUID()
  formVersionId?: string;

  @IsInt()
  @Min(0)
  mandatoryPhotoCount!: number;

  @IsBoolean()
  mandatoryGps!: boolean;

  @IsBoolean()
  mandatorySignature!: boolean;

  @IsOptional()
  @IsString()
  kpiKey?: string;
}

export class StageInputDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsBoolean()
  allowIncompletePreparation!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneInputDto)
  milestones!: MilestoneInputDto[];

  // Role codes (e.g. "promoter"), not ids — keeps the payload readable and stable across
  // environments where role ids differ; resolved server-side.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedRoleCodes?: string[];

  @IsBoolean()
  requiresApproval!: boolean;

  @IsOptional()
  @IsString()
  approverRoleCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SopChecklistItemInputDto)
  sopChecklistItems?: SopChecklistItemInputDto[];
}

export class UpsertWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StageInputDto)
  stages!: StageInputDto[];
}
