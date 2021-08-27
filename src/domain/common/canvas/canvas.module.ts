import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Canvas } from './canvas.entity';
import { CanvasService } from './canvas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Canvas])],
  providers: [CanvasService],
  exports: [CanvasService],
})
export class CanvasModule {}
