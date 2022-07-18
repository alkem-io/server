import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { AspectModule } from '../aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { AspectService } from '../aspect/aspect.service';
import { AspectAuthorizationService } from '../aspect/aspect.service.authorization';
import { AspectResolverMutations } from '../aspect/aspect.resolver.mutations';
import { AspectResolverFields } from '../aspect/aspect.resolver.fields';
import { AspectResolverSubscriptions } from '../aspect/aspect.resolver.subscriptions';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectModule,
    CanvasModule,
    TypeOrmModule.forFeature([Callout]),
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
export class CalloutModule {}
