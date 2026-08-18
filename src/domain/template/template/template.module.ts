import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { TemplateContentSpaceModule } from '../template-content-space/template.content.space.module';
import { Template } from './template.entity';
import { TemplateResolverFields } from './template.resolver.fields';
import { TemplateResolverMutations } from './template.resolver.mutations';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';

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
    // Narrow InnovationPack registration ONLY — deliberately not the full
    // InnovationPackModule, whose own dependency graph this module has no
    // other reason to pull in. Mirrors the ClassificationEntryModule ->
    // Template precedent (classification.entry.module.ts). Used solely to
    // record the delete-time seed tombstone on the owning pack.
    TypeOrmModule.forFeature([Template, InnovationPack]),
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
