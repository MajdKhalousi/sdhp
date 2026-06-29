import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { envConfig } from './config/env.config';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SubscriptionPaymentsModule } from './modules/subscription-payments/subscription-payments.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { UsersModule } from './modules/users/users.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { QueueModule } from './modules/queue/queue.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { PrescriptionTemplatesModule } from './modules/prescription-templates/prescription-templates.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { MedicalTimelineModule } from './modules/medical-timeline/medical-timeline.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AllergiesModule } from './modules/allergies/allergies.module';
import { LabsModule } from './modules/labs/labs.module';
import { RadiologyModule } from './modules/radiology/radiology.module';
import { MedicalFilesModule } from './modules/medical-files/medical-files.module';
import { ClinicalReportsModule } from './modules/clinical-reports/clinical-reports.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ClinicSettingsModule } from './modules/clinic-settings/clinic-settings.module';
import { VisitTypesModule } from './modules/visit-types/visit-types.module';
import { ServicesModule } from './modules/services/services.module';
import { MedicalServiceRequestsModule } from './modules/medical-service-requests/medical-service-requests.module';
import { DoctorSchedulesModule } from './modules/doctor-schedules/doctor-schedules.module';
import { FollowupsModule } from './modules/followups/followups.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { SubscriptionAccessModule } from './common/subscription/subscription-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envConfig,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    SubscriptionPaymentsModule,
    BranchesModule,
    DepartmentsModule,
    UsersModule,
    DoctorsModule,
    EmployeesModule,
    PatientsModule,
    AppointmentsModule,
    QueueModule,
    EncountersModule,
    PrescriptionTemplatesModule,
    PrescriptionsModule,
    MedicalTimelineModule,
    ReportsModule,
    AllergiesModule,
    LabsModule,
    RadiologyModule,
    MedicalFilesModule,
    ClinicalReportsModule,
    BillingModule,
    AuditLogsModule,
    ClinicSettingsModule,
    VisitTypesModule,
    ServicesModule,
    MedicalServiceRequestsModule,
    DoctorSchedulesModule,
    FollowupsModule,
    DashboardModule,
    SubscriptionAccessModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
