import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationPayloadSpaceCollaborationCalloutResolverFields } from './field-resolvers/space/in.app.notification.payload.space.collaboration.callout.resolver.fields';
import {
  InAppNotificationPayloadOrganizationMessageDirectResolverFields,
  InAppNotificationPayloadSpaceCommunityContributorResolverFields,
  InAppNotificationPayloadUserMessageRoomResolverFields,
} from './field-resolvers';

@Module({
  imports: [AuthorizationModule],
  providers: [
    // add in all the other payload resolvers from the ../field-resolvers directory
    InAppNotificationPayloadOrganizationMessageDirectResolverFields,
    InAppNotificationPayloadSpaceCollaborationCalloutResolverFields,
    InAppNotificationPayloadSpaceCommunityContributorResolverFields,
    InAppNotificationPayloadUserMessageRoomResolverFields,
  ],
  exports: [],
})
export class InAppNotificationPayloadModule {}
