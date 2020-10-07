import { Module } from '@nestjs/common';
import { TagResolver } from './tag.resolver';

@Module({
  providers: [TagResolver],
})
export class TagModule {}
