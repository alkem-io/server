import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationExternalAdapterModule } from '@services/adapters/notification-external-adapter/notification.external.adapter.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { PlatformAuditEntry } from './platform.audit.entry.entity';
import { PlatformAuditEntryRepository } from './platform.audit.entry.repository';
import { UserEmailChangeService } from './user.email.change.service';
import { UserEmailChangeAuditService } from './user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from './user.email.change.subject.footprint.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAuditEntry]),
    UserModule,
    UserLookupModule,
    SpaceLookupModule,
    KratosModule,
    NotificationExternalAdapterModule,
  ],
  providers: [
    PlatformAuditEntryRepository,
    UserEmailChangeAuditService,
    UserEmailChangeSubjectFootprintResolver,
    UserEmailChangeService,
  ],
  exports: [
    UserEmailChangeService,
    UserEmailChangeAuditService,
    PlatformAuditEntryRepository,
  ],
})
export class UserEmailChangeModule {}
