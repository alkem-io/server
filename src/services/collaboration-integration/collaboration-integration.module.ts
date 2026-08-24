import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { CollaboraDocumentModule } from '@domain/collaboration/collabora-document/collabora.document.module';
import { MemoModule } from '@domain/common/memo';
import { Memo } from '@domain/common/memo/memo.entity';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CollaborationIntegrationController } from './collaboration-integration.controller';
import { CollaborationIntegrationService } from './collaboration-integration.service';

/**
 * The unified collaboration-integration consumer module (memo + whiteboard).
 * Hosts the new unified `collaboration-*` @MessagePattern handlers that the
 * unified collaboration-service calls. Coexists with the two legacy integration
 * modules until the big-bang cutover.
 */
@Module({
  imports: [
    AuthorizationModule,
    ActorContextModule,
    ActorLookupModule,
    CollaboraDocumentModule,
    MemoModule,
    WhiteboardModule,
    UserLookupModule,
    ContributionReporterModule,
    EntityResolverModule,
    FileServiceAdapterModule,
    // Direct repo access for the one-pass migration read (FR-009).
    TypeOrmModule.forFeature([Memo, Whiteboard]),
  ],
  controllers: [CollaborationIntegrationController],
  providers: [CollaborationIntegrationService],
  exports: [CollaborationIntegrationService],
})
export class CollaborationIntegrationModule {}
