import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Communication } from './communication.entity';
import { CommunicationResolverFields } from './communication.resolver.fields';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { CommunicationService } from './communication.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationAuthorizationService } from './communication.service.authorization';
import { DiscussionModule } from '../discussion/discussion.module';
import { CommunicationAdapterModule } from '@services/platform/communication-adapter/communication-adapter.module';
import { UpdatesModule } from '../updates/updates.module';
import { IdentityResolverModule } from '../identity-resolver/identity.resolver.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    DiscussionModule,
    RoomModule,
    CommunicationAdapterModule,
    UpdatesModule,
    IdentityResolverModule,
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [
    CommunicationService,
    CommunicationResolverMutations,
    CommunicationResolverFields,
    CommunicationAuthorizationService,
  ],
  exports: [CommunicationService, CommunicationAuthorizationService],
})
export class CommunicationModule {}
