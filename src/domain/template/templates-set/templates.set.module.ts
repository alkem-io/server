import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateModule } from '../template/template.module';
import { TemplatesSet } from './templates.set.entity';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateModule,
    NamingModule,
    StorageAggregatorResolverModule,
    CollaborationModule,
    InputCreatorModule,
    TypeOrmModule.forFeature([TemplatesSet]),
  ],
  providers: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
  exports: [
    TemplatesSetService,
    TemplatesSetAuthorizationService,
    TemplatesSetResolverMutations,
    TemplatesSetResolverFields,
  ],
})
export class TemplatesSetModule {}
