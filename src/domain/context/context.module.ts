import { Module } from '@nestjs/common';
import { ContextResolver } from './context.resolver';

@Module({
  providers: [ContextResolver],
})
export class ContextModule {}
