import { Module } from '@nestjs/common';
import { MetadataResolver } from './metadata.resolver';
import { MetadataService } from './metadata.service';

@Module({
  providers: [MetadataResolver, MetadataService],
})
export class MetadataModule {}
