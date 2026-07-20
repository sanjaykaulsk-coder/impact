import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideDeviationRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
