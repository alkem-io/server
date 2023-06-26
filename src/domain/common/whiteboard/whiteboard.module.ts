import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { WhiteboardCheckoutModule } from '../whiteboard-checkout/whiteboard.checkout.module';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardResolverFields } from './whiteboard.resolver.fields';
import { WhiteboardResolverMutations } from './whiteboard.resolver.mutations';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { WhiteboardResolverSubscriptions } from '@domain/common/whiteboard/whiteboard.resolver.subscriptions';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ProfileModule } from '../profile/profile.module';
import { WhiteboardResolverQueries } from './whiteboard.resolver.queries';

@Module({
  imports: [
    EntityResolverModule,
    ElasticsearchModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    WhiteboardCheckoutModule,
    VisualModule,
    ProfileModule,
    UserModule,
    TypeOrmModule.forFeature([Whiteboard]),
  ],
  providers: [
    WhiteboardResolverQueries,
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
    WhiteboardResolverSubscriptions,
  ],
  exports: [
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
  ],
})
export class WhiteboardModule {}
