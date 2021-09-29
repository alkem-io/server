import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Visual } from './visual.entity';
import { VisualService } from './visual.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Visual])],
  providers: [VisualService],
  exports: [VisualService],
})
export class VisualModule {}
