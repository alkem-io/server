import { Module } from '@nestjs/common';
import { SpaceFilterService } from './space.filter.service';

@Module({
  imports: [],
  providers: [SpaceFilterService],
  exports: [SpaceFilterService],
})
export class SpaceFilterModule {}
