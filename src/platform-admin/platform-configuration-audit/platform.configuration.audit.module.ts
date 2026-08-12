import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConfigurationAuditService } from './platform.configuration.audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditEntry])],
  providers: [PlatformConfigurationAuditService],
  exports: [PlatformConfigurationAuditService],
})
export class PlatformConfigurationAuditModule {}
