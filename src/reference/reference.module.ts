import { Module } from '@nestjs/common';
import { ReferenceResolver } from './reference.resolver';

@Module({
  providers: [ReferenceResolver]
})
export class ReferenceModule {}
