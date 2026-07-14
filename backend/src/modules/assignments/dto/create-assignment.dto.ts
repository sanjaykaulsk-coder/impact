import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  pjpRowId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsDateString()
  assignmentDate!: string;
}
