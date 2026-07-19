import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CancelPjpRowDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PostponePjpRowDto {
  @IsString()
  newDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReschedulePjpRowDto {
  @IsString()
  newDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReassignPjpRowDto {
  @IsUUID()
  supervisorUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
