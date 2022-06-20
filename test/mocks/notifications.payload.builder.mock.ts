import { NotificationsPayloadBuilder } from '@core/microservices';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockNotificationsPayloadBuilder: ValueProvider<
  PublicPart<NotificationsPayloadBuilder>
> = {
  provide: NotificationsPayloadBuilder,
  useValue: {
    buildApplicationCreatedNotificationPayload: jest.fn(),
    buildAspectCreatedPayload: jest.fn(),
    buildCommentCreatedOnAspectPayload: jest.fn(),
    buildCommunicationDiscussionCreatedNotificationPayload: jest.fn(),
    buildCommunicationUpdateSentNotificationPayload: jest.fn(),
    buildCommunityContextReviewSubmittedNotificationPayload: jest.fn(),
    buildCommunityNewMemberPayload: jest.fn(),
    buildUserRegisteredNotificationPayload: jest.fn(),
  },
};
