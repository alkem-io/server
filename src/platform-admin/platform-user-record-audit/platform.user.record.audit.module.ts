import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformUserRecordAuditService } from './platform.user.record.audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditEntry])],
  providers: [PlatformUserRecordAuditService],
  exports: [PlatformUserRecordAuditService],
})
export class PlatformUserRecordAuditModule {}
