import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { CommentsModule } from '@domain/communication/comments/comments.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';
import { AspectResolverFields } from './aspect.resolver.fields';
import { AspectAuthorizationService } from './aspect.service.authorization';
import { AspectResolverSubscriptions } from './aspect.resolver.subscriptions';
import { UserModule } from '@domain/community/user/user.module';
import { CardProfileModule } from '../card-profile/card.profile.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CommentsModule,
    VisualModule,
    UserModule,
    CardProfileModule,
    TypeOrmModule.forFeature([Aspect]),
  ],
  providers: [
    AspectResolverMutations,
    AspectService,
    AspectAuthorizationService,
    AspectResolverFields,
    AspectResolverSubscriptions,
  ],
  exports: [AspectService, AspectAuthorizationService],
})
export class AspectModule {}
