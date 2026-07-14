import { AssignmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
