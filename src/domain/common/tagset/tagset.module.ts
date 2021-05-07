import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tagset } from './tagset.entity';
import { TagsetService } from './tagset.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tagset])],
  providers: [TagsetService],
  exports: [TagsetService],
})
export class TagsetModule {}
