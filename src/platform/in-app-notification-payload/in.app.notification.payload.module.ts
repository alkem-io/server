import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationPayloadSpaceCollaborationCalloutResolverFields } from './field-resolvers/space/in.app.notification.payload.space.collaboration.callout.resolver.fields';
import {
  InAppNotificationPayloadOrganizationMessageDirectResolverFields,
  InAppNotificationPayloadOrganizationMessageRoomResolverFields,
  InAppNotificationPayloadPlatformForumDiscussionResolverFields,
  InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields,
  InAppNotificationPayloadPlatformUserProfileRemovedResolverFields,
  InAppNotificationPayloadSpaceCollaborationCalloutPostCommentResolverFields,
  InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields,
  InAppNotificationPayloadSpaceCommunicationUpdateResolverFields,
  InAppNotificationPayloadSpaceCommunityApplicationResolverFields,
  InAppNotificationPayloadSpaceCommunityContributorResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationPlatformResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationResolverFields,
  InAppNotificationPayloadSpaceResolverFields,
  InAppNotificationPayloadUserMessageDirectResolverFields,
  InAppNotificationPayloadUserMessageRoomResolverFields,
} from './field-resolvers';
import { MessageDetailsModule } from '@domain/communication/message.details/message.details.module';
@Module({
  imports: [AuthorizationModule, MessageDetailsModule],
  providers: [
    // add in all the other payload resolvers from the ../field-resolvers directory
    InAppNotificationPayloadOrganizationMessageDirectResolverFields,
    InAppNotificationPayloadSpaceCollaborationCalloutResolverFields,
    InAppNotificationPayloadSpaceCollaborationCalloutPostCommentResolverFields,
    InAppNotificationPayloadSpaceResolverFields,
    InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields,
    InAppNotificationPayloadSpaceCommunicationUpdateResolverFields,
    InAppNotificationPayloadSpaceCommunityContributorResolverFields,
    InAppNotificationPayloadSpaceCommunityApplicationResolverFields,
    InAppNotificationPayloadSpaceCommunityInvitationResolverFields,
    InAppNotificationPayloadSpaceCommunityInvitationPlatformResolverFields,
    InAppNotificationPayloadUserMessageRoomResolverFields,
    InAppNotificationPayloadUserMessageDirectResolverFields,
    InAppNotificationPayloadOrganizationMessageDirectResolverFields,
    InAppNotificationPayloadOrganizationMessageRoomResolverFields,
    InAppNotificationPayloadPlatformGlobalRoleChangeResolverFields,
    InAppNotificationPayloadPlatformForumDiscussionResolverFields,
    InAppNotificationPayloadPlatformUserProfileRemovedResolverFields,
  ],
  exports: [],
})
export class InAppNotificationPayloadModule {}
