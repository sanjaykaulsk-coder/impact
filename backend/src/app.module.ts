import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './core/prisma/prisma.module';
import { StorageModule } from './core/storage/storage.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { FormsModule } from './modules/forms/forms.module';
import { HealthModule } from './modules/health/health.module';
import { PjpModule } from './modules/pjp/pjp.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    AssignmentsModule,
    CampaignsModule,
    ClientsModule,
    ExecutionModule,
    FormsModule,
    HealthModule,
    PjpModule,
    SupervisorModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
