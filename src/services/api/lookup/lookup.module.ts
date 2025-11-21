import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupService } from './lookup.service';
import { LookupResolverQueries } from './lookup.resolver.queries';
import { LookupResolverFields } from './lookup.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalendarEventModule } from '@domain/timeline/event/event.module';
import { CalendarModule } from '@domain/timeline/calendar/calendar.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { PlatformInvitationModule } from '@domain/access/invitation.platform/platform.invitation.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { AccountModule } from '@domain/space/account/account.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { LookupMyPrivilegesResolverFields } from './lookup.resolver.my.privileges.fields';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { KnowledgeBaseModule } from '@domain/common/knowledge-base/knowledge.base.module';
import { SpaceAboutModule } from '@domain/space/space.about/space.about.module';
import { TemplateContentSpaceModule } from '@domain/template/template-content-space/template.content.space.module';
import { MemoModule } from '@domain/common/memo';
import { CalloutContributionModule } from '@domain/collaboration/callout-contribution/callout.contribution.module';
import { ConversationModule } from '@domain/communication/conversation/conversation.module';

@Module({
  imports: [
    AccountModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    CollaborationModule,
    CalloutsSetModule,
    SpaceAboutModule,
    TemplateModule,
    TemplatesSetModule,
    TemplatesManagerModule,
    WhiteboardModule,
    MemoModule,
    InnovationFlowModule,
    InnovationPackModule,
    PostModule,
    ProfileModule,
    CalloutModule,
    CalloutContributionModule,
    CalendarModule,
    CalendarEventModule,
    RoomModule,
    ApplicationModule,
    InvitationModule,
    PlatformInvitationModule,
    InnovationHubModule,
    DocumentModule,
    StorageAggregatorModule,
    StorageBucketModule,
    PlatformAuthorizationPolicyModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorModule,
    SpaceModule,
    CommunityGuidelinesModule,
    TemplateContentSpaceModule,
    RoleSetModule,
    LicenseModule,
    ConversationModule,
    KnowledgeBaseModule,
  ],
  providers: [
    LookupService,
    LookupResolverQueries,
    LookupResolverFields,
    LookupMyPrivilegesResolverFields,
  ],
  exports: [LookupService],
})
export class LookupModule {}
