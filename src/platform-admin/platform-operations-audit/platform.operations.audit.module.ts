import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformOperationsAuditService } from './platform.operations.audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditEntry])],
  providers: [PlatformOperationsAuditService],
  exports: [PlatformOperationsAuditService],
})
export class PlatformOperationsAuditModule {}
