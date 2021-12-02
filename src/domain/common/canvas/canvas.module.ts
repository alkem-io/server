import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { CanvasCheckoutModule } from '../canvas-checkout/canvas.checkout.module';
import { Canvas } from './canvas.entity';
import { CanvasResolverMutations } from './canvas.resolver.mutations';
import { CanvasService } from './canvas.service';
import { CanvasAuthorizationService } from './canvas.service.authorization';

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
  ],
  exports: [CanvasService, CanvasAuthorizationService, CanvasResolverMutations],
})
export class CanvasModule {}
