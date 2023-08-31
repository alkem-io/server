import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { ProfileModule } from '../profile/profile.module';
import { WhiteboardRt } from './whiteboard.rt.entity';
import { WhiteboardRtResolverFields } from './whiteboard.rt.resolver.fields';
import { WhiteboardRtResolverMutations } from './whiteboard.rt.resolver.mutations';
import { WhiteboardRtService } from './whiteboard.rt.service';
import { WhiteboardRtAuthorizationService } from './whiteboard-rt-authorization.service';

@Module({
  imports: [
    EntityResolverModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    VisualModule,
    ProfileModule,
    UserModule,
    TypeOrmModule.forFeature([WhiteboardRt]),
  ],
  providers: [
    WhiteboardRtService,
    WhiteboardRtAuthorizationService,
    WhiteboardRtResolverMutations,
    WhiteboardRtResolverFields,
  ],
  exports: [
    WhiteboardRtService,
    WhiteboardRtAuthorizationService,
    WhiteboardRtResolverMutations,
    WhiteboardRtResolverFields,
  ],
})
export class WhiteboardRtModule {}
