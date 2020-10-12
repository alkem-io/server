import { Module } from '@nestjs/common';
import { ReferenceResolver } from './reference.resolver';
import { ReferenceService } from './reference.service';

@Module({
  providers: [ReferenceResolver, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
