import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { AdminCommunicationService } from './admin.communication.service';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationResolverQueries } from './admin.communication.resolver.queries';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { DiscussionModule } from '@domain/communication/discussion/discussion.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    CommunicationModule,
    CommunicationAdapterModule,
    DiscussionModule,
  ],
  providers: [
    AdminCommunicationService,
    AdminCommunicationResolverMutations,
    AdminCommunicationResolverQueries,
  ],
  exports: [AdminCommunicationService],
})
export class AdminCommunicationModule {}
