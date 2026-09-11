import { CredentialModule } from '@domain/actor/credential/credential.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformAuditEntryRepository } from '@domain/community/user-email-change/platform.audit.entry.repository';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountDeletionAuditService } from './account.deletion.audit.service';
import { AccountDeletionBlockerService } from './account.deletion.blocker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAuditEntry]),
    AccountLookupModule,
    OrganizationLookupModule,
    CredentialModule,
  ],
  providers: [
    PlatformAuditEntryRepository,
    AccountDeletionAuditService,
    AccountDeletionBlockerService,
  ],
  exports: [AccountDeletionAuditService, AccountDeletionBlockerService],
})
export class AccountDeletionModule {}
