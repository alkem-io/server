import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InnovationSpaceService } from './innovation.space.service';
import { InnovationSpace } from './innovation.space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InnovationSpace])],
  providers: [InnovationSpaceService],
  exports: [InnovationSpaceService],
})
export class InnovationSpaceModule {}
