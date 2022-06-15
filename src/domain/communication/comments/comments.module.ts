import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/platform/communication-adapter/communication-adapter.module';
import { RoomModule } from '../room/room.module';
import { Comments } from './comments.entity';
import { CommentsResolverFields } from './comments.resolver.fields';
import { CommentsResolverMutations } from './comments.resolver.mutations';
import { CommentsService } from './comments.service';
import { CommentsAuthorizationService } from './comments.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    RoomModule,
    CommunicationAdapterModule,
    TypeOrmModule.forFeature([Comments]),
  ],
  providers: [
    CommentsService,
    CommentsAuthorizationService,
    CommentsResolverFields,
    CommentsResolverMutations,
  ],
  exports: [CommentsService, CommentsAuthorizationService],
})
export class CommentsModule {}
