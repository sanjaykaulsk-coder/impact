import { IsArray, IsIn } from 'class-validator';
import { DASHBOARD_WIDGET_KEYS } from '../../../common/dashboard-widgets';

export class SetDashboardConfigDto {
  @IsArray()
  @IsIn(DASHBOARD_WIDGET_KEYS, { each: true })
  widgetKeys!: string[];
}
