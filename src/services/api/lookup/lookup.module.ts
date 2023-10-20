import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupService } from './lookup.service';
import { LookupResolverQueries } from './lookup.resolver.queries';
import { LookupResolverFields } from './lookup.resolver.fields';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { WhiteboardTemplateModule } from '@domain/template/whiteboard-template/whiteboard.template.module';
import { InnovationFlowModule } from '@domain/challenge/innovation-flow/innovation.flow.module';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContextModule } from '@domain/context/context/context.module';
import { CalendarEventModule } from '@domain/timeline/event/event.module';
import { CalendarModule } from '@domain/timeline/calendar/calendar.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { CalloutTemplateModule } from '@domain/template/callout-template/callout.template.module';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { DocumentModule } from '@domain/storage/document/document.module';

@Module({
  imports: [
    AuthorizationModule,
    CommunityModule,
    CollaborationModule,
    ContextModule,
    CalloutTemplateModule,
    WhiteboardModule,
    WhiteboardRtModule,
    WhiteboardTemplateModule,
    InnovationFlowModule,
    InnovationFlowTemplateModule,
    PostModule,
    ProfileModule,
    CalloutModule,
    CalendarModule,
    CalendarEventModule,
    RoomModule,
    ApplicationModule,
    InvitationModule,
    ChallengeModule,
    OpportunityModule,
    DocumentModule,
  ],
  providers: [LookupService, LookupResolverQueries, LookupResolverFields],
  exports: [LookupService],
})
export class LookupModule {}
