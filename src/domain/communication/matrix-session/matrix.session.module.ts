import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { MatrixSessionResolverMutations } from './matrix.session.resolver.mutations';
import { MatrixSessionService } from './matrix.session.service';

@Module({
  // `TypeOrmModule.forFeature([PlatformAuditEntry])` is what provides the
  // `Repository<PlatformAuditEntry>` the service injects. Deliberately NOT
  // `UserEmailChangeModule`, which provides a different repository class.
  imports: [
    CommunicationAdapterModule,
    TypeOrmModule.forFeature([PlatformAuditEntry]),
  ],
  providers: [MatrixSessionService, MatrixSessionResolverMutations],
})
export class MatrixSessionModule {}
