import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from './context.service';
import { Context } from '@domain/context';
import { EcosystemModelModule } from '../ecosystem-model/ecosystem-model.module';
import { AspectModule } from '../aspect/aspect.module';
import { ContextResolverFields } from './context.resolver.fields';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ContextAuthorizationService } from './context.service.authorization';

@Module({
  imports: [
    AuthorizationEngineModule,
    AspectModule,
    ReferenceModule,
    EcosystemModelModule,
    TypeOrmModule.forFeature([Context]),
  ],
  providers: [
    ContextResolverMutations,
    ContextResolverFields,
    ContextService,
    ContextAuthorizationService,
  ],
  exports: [ContextService, ContextAuthorizationService],
})
export class ContextModule {}
