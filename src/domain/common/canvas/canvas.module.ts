import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { CanvasCheckoutModule } from '../canvas-checkout/canvas.checkout.module';
import { Canvas } from './canvas.entity';
import { CanvasResolverFields } from './canvas.resolver.fields';
import { CanvasResolverMutations } from './canvas.resolver.mutations';
import { CanvasService } from './canvas.service';
import { CanvasAuthorizationService } from './canvas.service.authorization';
import { CanvasResolverSubscriptions } from '@domain/common/canvas/canvas.resolver.subscriptions';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CanvasCheckoutModule,
    TypeOrmModule.forFeature([Canvas]),
  ],
  providers: [
    CanvasService,
    CanvasAuthorizationService,
    CanvasResolverMutations,
    CanvasResolverFields,
    CanvasResolverSubscriptions,
  ],
  exports: [
    CanvasService,
    CanvasAuthorizationService,
    CanvasResolverMutations,
    CanvasResolverFields,
  ],
})
export class CanvasModule {}
