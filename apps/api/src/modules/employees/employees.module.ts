import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeesDocumentsService } from './employees-documents.service';
import { EmployeeDocumentsController } from './employees-documents.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceController, DailyAttendanceController } from './attendance.controller';
import { LeaveService } from './leave.service';
import { LeaveController, LeaveQueueController } from './leave.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuditLogsModule, StorageModule, UsersModule],
  controllers: [
    EmployeesController,
    EmployeeDocumentsController,
    AttendanceController,
    DailyAttendanceController,
    LeaveController,
    LeaveQueueController,
  ],
  providers: [EmployeesService, EmployeesDocumentsService, AttendanceService, LeaveService],
})
export class EmployeesModule {}
