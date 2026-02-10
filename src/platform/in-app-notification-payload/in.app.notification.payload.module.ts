import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationLoaderCreator } from '@core/dataloader/creators';
import { CalendarEventLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/calendar.event.loader.creator';
import { MessageDetailsModule } from '@domain/communication/message.details/message.details.module';
import { Module } from '@nestjs/common';
import {
  InAppNotificationPayloadOrganizationMessageDirectResolverFields,
  InAppNotificationPayloadOrganizationMessageRoomResolverFields,
  InAppNotificationPayloadPlatformForumDiscussionResolverFields,
  InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields,
  InAppNotificationPayloadPlatformUserProfileRemovedResolverFields,
  InAppNotificationPayloadSpaceCollaborationCalloutCommentResolverFields,
  InAppNotificationPayloadSpaceCollaborationCalloutPostCommentResolverFields,
  InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields,
  InAppNotificationPayloadSpaceCommunicationUpdateResolverFields,
  InAppNotificationPayloadSpaceCommunityApplicationResolverFields,
  InAppNotificationPayloadSpaceCommunityCalendarEventResolverFields,
  InAppNotificationPayloadSpaceCommunityContributorResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationPlatformResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationResolverFields,
  InAppNotificationPayloadSpaceResolverFields,
  InAppNotificationPayloadUserMessageDirectResolverFields,
  InAppNotificationPayloadUserMessageRoomResolverFields,
  InAppNotificationPayloadVirtualContributorFieldsResolver,
} from './field-resolvers';
import { InAppNotificationPayloadSpaceCollaborationCalloutResolverFields } from './field-resolvers/space/in.app.notification.payload.space.collaboration.callout.resolver.fields';
import { InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields } from './field-resolvers/space/in.app.notification.payload.space.community.calendar.event.comment.resolver.fields';

@Module({
  imports: [AuthorizationModule, MessageDetailsModule],
  providers: [
    // add in all the other payload resolvers from the ../field-resolvers directory
    InAppNotificationPayloadSpaceCollaborationCalloutResolverFields,
    InAppNotificationPayloadSpaceCollaborationCalloutPostCommentResolverFields,
    InAppNotificationPayloadSpaceCollaborationCalloutCommentResolverFields,
    InAppNotificationPayloadSpaceResolverFields,
    InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields,
    InAppNotificationPayloadSpaceCommunicationUpdateResolverFields,
    InAppNotificationPayloadSpaceCommunityContributorResolverFields,
    InAppNotificationPayloadSpaceCommunityApplicationResolverFields,
    InAppNotificationPayloadSpaceCommunityInvitationResolverFields,
    InAppNotificationPayloadSpaceCommunityInvitationPlatformResolverFields,
    InAppNotificationPayloadSpaceCommunityCalendarEventResolverFields,
    InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields,
    InAppNotificationPayloadUserMessageRoomResolverFields,
    InAppNotificationPayloadUserMessageDirectResolverFields,
    InAppNotificationPayloadOrganizationMessageDirectResolverFields,
    InAppNotificationPayloadOrganizationMessageRoomResolverFields,
    InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields,
    InAppNotificationPayloadPlatformForumDiscussionResolverFields,
    InAppNotificationPayloadPlatformUserProfileRemovedResolverFields,
    OrganizationLoaderCreator,
    CalendarEventLoaderCreator,
    InAppNotificationPayloadVirtualContributorFieldsResolver,
  ],
  exports: [],
})
export class InAppNotificationPayloadModule {}
