import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Visual } from './visual.entity';
import { VisualService } from './visual.service';

@Module({
  imports: [AuthorizationEngineModule, TypeOrmModule.forFeature([Visual])],
  providers: [VisualService],
  exports: [VisualService],
})
export class VisualModule {}
