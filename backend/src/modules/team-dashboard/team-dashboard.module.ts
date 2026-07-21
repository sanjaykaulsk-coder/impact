import { Module } from '@nestjs/common';
import { TeamDashboardController } from './team-dashboard.controller';
import { TeamDashboardService } from './team-dashboard.service';

@Module({
  controllers: [TeamDashboardController],
  providers: [TeamDashboardService],
})
export class TeamDashboardModule {}
