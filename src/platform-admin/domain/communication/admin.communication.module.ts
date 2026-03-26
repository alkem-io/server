import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { ConversationModule } from '@domain/communication/conversation/conversation.module';
import { Room } from '@domain/communication/room/room.entity';
import { CommunityModule } from '@domain/community/community/community.module';
import { Space } from '@domain/space/space/space.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { AdminCommunicationResolverMutations } from './admin.communication.resolver.mutations';
import { AdminCommunicationService } from './admin.communication.service';
import { AdminCommunicationSpaceSyncService } from './admin.communication.space.sync.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    RoleSetModule,
    CommunicationModule,
    CommunicationAdapterModule,
    ConversationModule,
    TypeOrmModule.forFeature([Space, Forum, Room]),
  ],
  providers: [
    AdminCommunicationService,
    AdminCommunicationSpaceSyncService,
    AdminCommunicationResolverMutations,
  ],
  exports: [AdminCommunicationService],
})
export class AdminCommunicationModule {}
