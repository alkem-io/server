import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { WhiteboardCheckoutLifecycleOptionsProvider } from './whiteboard.checkout.lifecycle.options.provider';
import { WhiteboardCheckout } from './whiteboard.checkout.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteboardCheckoutService } from './whiteboard.checkout.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { WhiteboardCheckoutAuthorizationService } from './whiteboard.checkout.service.authorization';
import { WhiteboardCheckoutResolverFields } from './whiteboard.checkout.resolver.fields';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    TypeOrmModule.forFeature([WhiteboardCheckout]),
  ],
  providers: [
    WhiteboardCheckoutService,
    WhiteboardCheckoutAuthorizationService,
    WhiteboardCheckoutLifecycleOptionsProvider,
    WhiteboardCheckoutResolverFields,
  ],
  exports: [
    WhiteboardCheckoutService,
    WhiteboardCheckoutAuthorizationService,
    WhiteboardCheckoutLifecycleOptionsProvider,
  ],
})
export class WhiteboardCheckoutModule {}
