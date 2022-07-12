import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { ContextResolverMutations } from './context.resolver.mutations';
import { ContextResolverSubscriptions } from './context.resolver.subscriptions';
import { ContextService } from '@domain/context/context/context.service';
import { Context } from '@domain/context/context';
import { EcosystemModelModule } from '@domain/context/ecosystem-model/ecosystem-model.module';
import { AspectModule } from '@domain/collaboration/aspect/aspect.module';
import { ContextResolverFields } from '@domain/context/context/context.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ContextAuthorizationService } from './context.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { NamingModule } from '@services/domain/naming/naming.module';
import { LocationModule } from '@domain/common/location';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectModule,
    CanvasModule,
    ReferenceModule,
    EcosystemModelModule,
    VisualModule,
    NamingModule,
    LocationModule,
    TypeOrmModule.forFeature([Context]),
  ],
  providers: [
    ContextResolverMutations,
    ContextResolverSubscriptions,
    ContextResolverFields,
    ContextService,
    ContextAuthorizationService,
  ],
  exports: [ContextService, ContextAuthorizationService],
})
export class ContextModule {}
