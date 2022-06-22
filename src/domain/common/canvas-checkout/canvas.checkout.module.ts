import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CanvasCheckoutLifecycleOptionsProvider } from './canvas.checkout.lifecycle.options.provider';
import { CanvasCheckout } from './canvas.checkout.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasCheckoutService } from './canvas.checkout.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CanvasCheckoutAuthorizationService } from './canvas.checkout.service.authorization';
import { CanvasCheckoutResolverFields } from './canvas.checkout.resolver.fields';

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
    CanvasCheckoutLifecycleOptionsProvider,
    CanvasCheckoutResolverFields,
  ],
  exports: [
    CanvasCheckoutService,
    CanvasCheckoutAuthorizationService,
    CanvasCheckoutLifecycleOptionsProvider,
  ],
})
export class CanvasCheckoutModule {}
