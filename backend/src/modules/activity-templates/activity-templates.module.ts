import { Module } from '@nestjs/common';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ActivityTemplatesController } from './activity-templates.controller';
import { ActivityTemplatesService } from './activity-templates.service';

@Module({
  imports: [WorkflowsModule],
  controllers: [ActivityTemplatesController],
  providers: [ActivityTemplatesService],
})
export class ActivityTemplatesModule {}
