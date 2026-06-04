import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationExternalAdapterModule } from '@services/adapters/notification-external-adapter/notification.external.adapter.module';
import { PlatformAuditEntry } from '../user-email-change/platform.audit.entry.entity';
import { PlatformAuditEntryRepository } from '../user-email-change/platform.audit.entry.repository';
import { UserPasswordChangeAuditService } from './user.password.change.audit.service';
import { UserPasswordChangeObserverService } from './user.password.change.observer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAuditEntry]),
    UserLookupModule,
    NotificationExternalAdapterModule,
  ],
  providers: [
    PlatformAuditEntryRepository,
    UserPasswordChangeAuditService,
    UserPasswordChangeObserverService,
  ],
  exports: [
    UserPasswordChangeObserverService,
    UserPasswordChangeAuditService,
    PlatformAuditEntryRepository,
  ],
})
export class UserPasswordChangeModule {}
