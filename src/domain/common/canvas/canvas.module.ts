import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasCheckoutModule } from '../canvas-checkout/canvas.checkout.module';
import { Canvas } from './canvas.entity';
import { CanvasService } from './canvas.service';

@Module({
  imports: [CanvasCheckoutModule, TypeOrmModule.forFeature([Canvas])],
  providers: [CanvasService],
  exports: [CanvasService],
})
export class CanvasModule {}
