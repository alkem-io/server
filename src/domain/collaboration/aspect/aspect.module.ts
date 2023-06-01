import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';
import { AspectResolverFields } from './aspect.resolver.fields';
import { AspectAuthorizationService } from './aspect.service.authorization';
import { AspectResolverSubscriptions } from './aspect.resolver.subscriptions';
import { UserModule } from '@domain/community/user/user.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { RoomModule } from '@domain/communication/room2/room.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    CommunityPolicyModule,
    VisualModule,
    UserModule,
    ProfileModule,
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
