import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from '@domain/context/context/context.service';
import { Context } from '@domain/context/context';
import { EcosystemModelModule } from '@domain/context/ecosystem-model/ecosystem-model.module';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { ContextResolverFields } from '@domain/context/context/context.resolver.fields';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';

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
