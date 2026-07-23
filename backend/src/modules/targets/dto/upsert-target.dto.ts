import { IsIn, IsISO8601, IsNumber, IsOptional, Min } from 'class-validator';
import { KPI_KEYS } from '../../../common/kpi-keys';

export class CreateTargetDto {
  @IsIn(KPI_KEYS)
  kpiKey!: string;

  @IsNumber()
  @Min(0)
  targetValue!: number;

  @IsOptional()
  @IsISO8601()
  periodStart?: string;

  @IsOptional()
  @IsISO8601()
  periodEnd?: string;
}
