import { Module } from '@nestjs/common';
import { SpaceLookupService } from './space.lookup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '../space/space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Space])], // Important this is empty!
  providers: [SpaceLookupService],
  exports: [SpaceLookupService],
})
export class SpaceLookupModule {}
