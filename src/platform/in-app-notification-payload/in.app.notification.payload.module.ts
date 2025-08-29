import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationPayloadSpaceCollaborationCalloutResolverFields } from './field-resolvers/space/in.app.notification.payload.space.collaboration.callout.resolver.fields';
import {
  InAppNotificationPayloadOrganizationMessageDirectResolverFields,
  InAppNotificationPayloadOrganizationMessageRoomResolverFields,
  InAppNotificationPayloadSpaceCommunicationMessageDirectResolverFields,
  InAppNotificationPayloadSpaceCommunicationUpdateResolverFields,
  InAppNotificationPayloadSpaceCommunityApplicationResolverFields,
  InAppNotificationPayloadSpaceCommunityContributorResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationPlatformResolverFields,
  InAppNotificationPayloadSpaceCommunityInvitationResolverFields,
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
  ],
  exports: [],
})
export class InAppNotificationPayloadModule {}
