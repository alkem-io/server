import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextService } from '@domain/context/context/context.service';
import { Context } from '@domain/context/context';
import { EcosystemModelModule } from '@domain/context/ecosystem-model/ecosystem-model.module';
import { ContextResolverFields } from '@domain/context/context/context.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ContextAuthorizationService } from './context.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { LocationModule } from '@domain/common/location';
import { ContextResolverQueries } from './context.resolver.queries';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ReferenceModule,
    EcosystemModelModule,
    VisualModule,
    NamingModule,
    LocationModule,
    TypeOrmModule.forFeature([Context]),
  ],
  providers: [
    ContextResolverMutations,
    ContextResolverQueries,
    ContextResolverFields,
    ContextService,
    ContextAuthorizationService,
  ],
  exports: [ContextService, ContextAuthorizationService],
})
export class ContextModule {}
