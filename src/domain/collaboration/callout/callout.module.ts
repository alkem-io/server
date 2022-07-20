import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { AspectModule } from '../aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { NamingModule } from '@services/domain/naming/naming.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectModule,
    CanvasModule,
    NamingModule,
    TypeOrmModule.forFeature([Callout]),
  ],
  providers: [
    CalloutResolverMutations,
    CalloutService,
    CalloutAuthorizationService,
    CalloutResolverFields,
    CalloutResolverSubscriptions,
  ],
  exports: [CalloutService, CalloutAuthorizationService],
})
export class CalloutModule {}
