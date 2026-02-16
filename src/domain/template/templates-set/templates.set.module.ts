import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateContentSpaceModule } from '@domain/template/template-content-space/template.content.space.module';
import { Module } from '@nestjs/common';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { TemplateModule } from '../template/template.module';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateModule,
    NamingModule,
    StorageAggregatorResolverModule,
    SpaceLookupModule,
    InputCreatorModule,
    TemplateContentSpaceModule,
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
