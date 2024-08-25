import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateModule } from '../template/template.module';
import { WhiteboardTemplateModule } from '../whiteboard-template/whiteboard.template.module';
import { CommunityGuidelinesTemplateModule } from '../community-guidelines-template/community.guidelines.template.module';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { TemplatesSet } from './templates.set.entity';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';
import { CalloutTemplateModule } from '../callout-template/callout.template.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutTemplateModule,
    TemplateModule,
    WhiteboardTemplateModule,
    CommunityGuidelinesTemplateModule,
    TemplateBaseModule,
    StorageAggregatorResolverModule,
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
