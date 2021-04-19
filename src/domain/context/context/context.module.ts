import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { Context } from './context.entity';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from './context.service';

@Module({
  imports: [ReferenceModule, TypeOrmModule.forFeature([Context])],
  providers: [ContextResolverMutations, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
