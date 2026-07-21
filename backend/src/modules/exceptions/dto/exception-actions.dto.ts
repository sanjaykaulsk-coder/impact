import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AssignExceptionDto {
  @IsUUID()
  ownerUserId!: string;
}

export class ExceptionRemarksDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class ActionTakenDto {
  @IsString()
  @MinLength(1)
  remarks!: string;
}

export class ResolveExceptionDto {
  @IsString()
  @MinLength(1)
  resolution!: string;
}

export class ReopenExceptionDto {
  @IsString()
  @MinLength(1)
  remarks!: string;
}
