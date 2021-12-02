import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasCheckoutModule } from '../canvas-checkout/canvas.checkout.module';
import { Canvas } from './canvas.entity';
import { CanvasResolverMutations } from './canvas.resolver.mutations';
import { CanvasService } from './canvas.service';

@Module({
  imports: [
    AuthorizationModule,
    CanvasCheckoutModule,
    TypeOrmModule.forFeature([Canvas]),
  ],
  providers: [CanvasService, CanvasResolverMutations],
  exports: [CanvasService, CanvasResolverMutations],
})
export class CanvasModule {}
