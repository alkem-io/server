import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationAdministrationAuditService } from './organization.administration.audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAuditEntry]),
    OrganizationLookupModule,
  ],
  providers: [OrganizationAdministrationAuditService],
  exports: [OrganizationAdministrationAuditService],
})
export class OrganizationAdministrationAuditModule {}
