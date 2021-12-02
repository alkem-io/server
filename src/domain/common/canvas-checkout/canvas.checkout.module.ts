import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CanvasCheckoutLifecycleOptionsProvider } from './canvas.checkout.lifecycle.options.provider';
import { CanvasCheckoutResolverMutations } from './canvas.checkout.resolver.mutations';
import { CanvasCheckout } from './canvas.checkout.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasCheckoutService } from './canvas.checkout.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CanvasCheckoutAuthorizationService } from './canvas.checkout.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    TypeOrmModule.forFeature([CanvasCheckout]),
  ],
  providers: [
    CanvasCheckoutService,
    CanvasCheckoutAuthorizationService,
    CanvasCheckoutResolverMutations,
    CanvasCheckoutLifecycleOptionsProvider,
  ],
  exports: [CanvasCheckoutService, CanvasCheckoutAuthorizationService],
})
export class CanvasCheckoutModule {}
