import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './template.entity';
import { TemplateResolverMutations } from './template.resolver.mutations';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { TemplateResolverFields } from './template.resolver.fields';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { TemplateContentSpaceModule } from '../template-content-space/template.content.space.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    CommunityGuidelinesModule,
    CalloutModule,
    WhiteboardModule,
    InnovationFlowModule,
    InputCreatorModule,
    StorageAggregatorResolverModule,
    CalloutsSetModule,
    TemplateContentSpaceModule,
    SpaceLookupModule,
    TypeOrmModule.forFeature([Template]),
  ],
  providers: [
    TemplateService,
    TemplateAuthorizationService,
    TemplateResolverMutations,
    TemplateResolverFields,
  ],
  exports: [TemplateService, TemplateAuthorizationService],
})
export class TemplateModule {}
