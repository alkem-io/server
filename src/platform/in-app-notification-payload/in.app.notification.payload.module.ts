import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { InAppNotificationPayloadSpaceCollaborationCalloutResolverFields } from './field-resolvers/space/in.app.notification.payload.space.collaboration.callout.resolver.fields';
import {
  InAppNotificationPayloadSpaceCommunityContributorResolverFields,
  InAppNotificationPayloadUserMessageRoomResolverFields,
} from './field-resolvers';

@Module({
  imports: [AuthorizationModule, InAppNotificationModule],
  providers: [
    // add in all the other payload resolvers from the ../field-resolvers directory
    InAppNotificationPayloadSpaceCollaborationCalloutResolverFields,
    InAppNotificationPayloadSpaceCommunityContributorResolverFields,
    InAppNotificationPayloadUserMessageRoomResolverFields,
  ],
  exports: [],
})
export class InAppNotificationPayloadModule {}
