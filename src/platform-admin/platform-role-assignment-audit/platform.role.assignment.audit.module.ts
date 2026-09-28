import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformRoleAssignmentAuditService } from './platform.role.assignment.audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditEntry])],
  providers: [PlatformRoleAssignmentAuditService],
  exports: [PlatformRoleAssignmentAuditService],
})
export class PlatformRoleAssignmentAuditModule {}
