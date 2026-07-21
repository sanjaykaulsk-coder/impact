import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const VERIFICATION_TYPES = ['GENERAL', 'SETUP', 'BRANDING_INSPECTION', 'REMOTE_SUPPORT'] as const;
const OUTCOMES = ['VERIFIED_OK', 'ISSUE_FOUND', 'COULD_NOT_CONNECT'] as const;

export class StartWhatsAppVerificationDto {
  @IsIn(VERIFICATION_TYPES)
  verificationType!: (typeof VERIFICATION_TYPES)[number];
}

export class CompleteWhatsAppVerificationDto {
  @IsIn(OUTCOMES)
  outcome!: (typeof OUTCOMES)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  remarks?: string;
}
