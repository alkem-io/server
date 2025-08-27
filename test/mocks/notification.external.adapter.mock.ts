import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';

export const MockNotificationsPayloadBuilder: ValueProvider<
  PublicPart<NotificationExternalAdapter>
> = {
  provide: NotificationExternalAdapter,
  useValue: {
    buildSpaceCommunityApplicationCreatedNotificationPayload: jest.fn(),
    buildSpaceCollaborationCreatedPayload: jest.fn(),
    buildSpaceCollaborationCalloutPostContributionCommentPayload: jest.fn(),
    buildPlatformForumDiscussionCreatedNotificationPayload: jest.fn(),
    buildSpaceCommunicationUpdateSentNotificationPayload: jest.fn(),
    buildSpaceCommunityNewMemberPayload: jest.fn(),
    buildPlatformUserRegisteredNotificationPayload: jest.fn(),
  },
};
