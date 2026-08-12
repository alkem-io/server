import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformResourceAuditService } from './platform.resource.audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditEntry])],
  providers: [PlatformResourceAuditService],
  exports: [PlatformResourceAuditService],
})
export class PlatformResourceAuditModule {}
