import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/platform/communication-adapter/communication-adapter.module';
import { AdminCommunicationService } from './admin.communication.service';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationResolverQueries } from './admin.communication.resolver.queries';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    CommunicationModule,
    CommunicationAdapterModule,
  ],
  providers: [
    AdminCommunicationService,
    AdminCommunicationResolverMutations,
    AdminCommunicationResolverQueries,
  ],
  exports: [AdminCommunicationService],
})
export class AdminCommunicationModule {}
