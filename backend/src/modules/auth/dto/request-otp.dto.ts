import { IsOptional, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'mobileNumber must be a 10-digit Indian mobile number' })
  mobileNumber!: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}
