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
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    EntityResolverModule,
    ContributionReporterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    WhiteboardCheckoutModule,
    VisualModule,
    ProfileModule,
    UserModule,
    TypeOrmModule.forFeature([Whiteboard]),
  ],
  providers: [
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
