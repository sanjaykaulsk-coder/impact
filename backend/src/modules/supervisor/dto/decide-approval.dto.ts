import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  // Required for a rejection (validated in the service, not here, since the rule is conditional on
  // `decision` — spec §25/§44 scenario 5: "approves/rejects with remarks," and a field worker needs
  // to know *why* to act on a correction).
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
