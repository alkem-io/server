import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from './context.service';
import { Context, Context2 } from '@domain/context';

@Module({
  imports: [
    ReferenceModule,
    TypeOrmModule.forFeature([Context]),
    TypeOrmModule.forFeature([Context2]),
  ],
  providers: [ContextResolverMutations, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
