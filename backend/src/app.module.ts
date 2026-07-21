import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './core/audit/audit.module';
import { NotificationModule } from './core/notifications/notification.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { StorageModule } from './core/storage/storage.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ActivityTemplatesModule } from './modules/activity-templates/activity-templates.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import { PjpModule } from './modules/pjp/pjp.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SkusModule } from './modules/skus/skus.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { TeamDashboardModule } from './modules/team-dashboard/team-dashboard.module';
import { WhatsAppVerificationModule } from './modules/whatsapp-verification/whatsapp-verification.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    NotificationModule,
    StorageModule,
    ActivityTemplatesModule,
    AlertsModule,
    AttendanceModule,
    AuthModule,
    AssignmentsModule,
    CampaignsModule,
    ClientsModule,
    ExceptionsModule,
    ExecutionModule,
    FormsModule,
    HealthModule,
    PjpModule,
    ReportsModule,
    SkusModule,
    SupervisorModule,
    TeamDashboardModule,
    WhatsAppVerificationModule,
    WorkflowsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
