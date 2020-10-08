import { Module } from '@nestjs/common';
import { TagsetResolver } from './tagset.resolver';
import { TagsetService } from './tagset.service';

@Module({
  providers: [TagsetService, TagsetResolver],
  exports: [TagsetService],
})
export class TagsetModule {}
