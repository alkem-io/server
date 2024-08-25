import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupService } from './lookup.service';
import { LookupResolverQueries } from './lookup.resolver.queries';
import { LookupResolverFields } from './lookup.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { WhiteboardTemplateModule } from '@domain/template/whiteboard-template/whiteboard.template.module';
import { InnovationFlowModule } from '@domain/collaboration/innovation-flow/innovation.flow.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContextModule } from '@domain/context/context/context.module';
import { CalendarEventModule } from '@domain/timeline/event/event.module';
import { CalendarModule } from '@domain/timeline/calendar/calendar.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { CommunityGuidelinesModule } from '@domain/community/community-guidelines/community.guidelines.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { AccountModule } from '@domain/space/account/account.module';
import { TemplateModule } from '@domain/template/template/template.module';

@Module({
  imports: [
    AccountModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunityModule,
    CollaborationModule,
    ContextModule,
    TemplateModule,
    WhiteboardModule,
    WhiteboardTemplateModule,
    InnovationFlowModule,
    InnovationPackModule,
    PostModule,
    ProfileModule,
    CalloutModule,
    CalendarModule,
    CalendarEventModule,
    RoomModule,
    ApplicationModule,
    InvitationModule,
    InnovationHubModule,
    DocumentModule,
    StorageAggregatorModule,
    StorageBucketModule,
    PlatformAuthorizationPolicyModule,
    UserModule,
    SpaceModule,
    CommunityGuidelinesModule,
    VirtualContributorModule,
  ],
  providers: [LookupService, LookupResolverQueries, LookupResolverFields],
  exports: [LookupService],
})
export class LookupModule {}
