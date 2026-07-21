import { Module } from '@nestjs/common';
import { TeamDashboardController } from './team-dashboard.controller';
import { TeamDashboardService } from './team-dashboard.service';

@Module({
  controllers: [TeamDashboardController],
  providers: [TeamDashboardService],
  // Exported so DashboardModule (S5.3) can reuse the same offline-threshold and delayed-activity
  // logic rather than duplicating it — see docs/ASSUMPTIONS.md A-070.
  exports: [TeamDashboardService],
})
export class TeamDashboardModule {}
