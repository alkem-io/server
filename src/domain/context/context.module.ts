import { Module } from '@nestjs/common';
import { ReferenceModule } from '../reference/reference.module';
import { ReferenceService } from '../reference/reference.service';
import { ContextResolver } from './context.resolver';

@Module({
  imports: [ReferenceModule],
  providers: [ContextResolver, ReferenceService],
})
export class ContextModule {}
