import { Module } from '@nestjs/common';
import { TeamDashboardModule } from '../team-dashboard/team-dashboard.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TeamDashboardModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
