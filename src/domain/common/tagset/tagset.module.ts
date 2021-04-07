import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tagset } from './tagset.entity';
import { TagsetResolver } from './tagset.resolver.mutations';
import { TagsetService } from './tagset.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tagset])],
  providers: [TagsetService, TagsetResolver],
  exports: [TagsetService],
})
export class TagsetModule {}
