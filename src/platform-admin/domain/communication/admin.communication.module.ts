import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { ConversationModule } from '@domain/communication/conversation/conversation.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationService } from './admin.communication.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    RoleSetModule,
    CommunicationModule,
    CommunicationAdapterModule,
    ConversationModule,
  ],
  providers: [AdminCommunicationService, AdminCommunicationResolverMutations],
  exports: [AdminCommunicationService],
})
export class AdminCommunicationModule {}
