import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';

@Module({
  imports: [],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
