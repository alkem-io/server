import { Module } from '@nestjs/common';
import { ReferenceModule } from '../reference/reference.module';
import { ContextResolver } from './context.resolver';
import { ContextService } from './context.service';

@Module({
  imports: [ReferenceModule],
  providers: [ContextResolver, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
