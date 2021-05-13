import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from './context.service';
import { Context } from '@domain/context';
import { EcosystemModelModule } from '../ecosystem-model/ecosystem-model.module';
import { AspectModule } from '../aspect/aspect.module';

@Module({
  imports: [
    AspectModule,
    ReferenceModule,
    EcosystemModelModule,
    TypeOrmModule.forFeature([Context]),
  ],
  providers: [ContextResolverMutations, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
