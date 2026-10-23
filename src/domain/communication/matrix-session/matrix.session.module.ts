import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { MatrixSessionResolverMutations } from './matrix.session.resolver.mutations';
import { MatrixSessionService } from './matrix.session.service';

@Module({
  // Deliberately `forFeature([PlatformAuditEntry])` and NOT
  // `UserEmailChangeModule`, which provides a different repository class.
  imports: [
    CommunicationAdapterModule,
    MessagingRedisModule,
    TypeOrmModule.forFeature([PlatformAuditEntry]),
  ],
  providers: [MatrixSessionService, MatrixSessionResolverMutations],
})
export class MatrixSessionModule {}
