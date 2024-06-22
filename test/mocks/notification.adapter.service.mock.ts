import { ValueProvider } from '@nestjs/common';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { PublicPart } from '../utils/public-part';

export const MockNotificationAdapter: ValueProvider<
  PublicPart<NotificationAdapter>
> = {
  provide: NotificationAdapter,
  useValue: {
    calloutPublished: jest.fn(),
    postCreated: jest.fn(),
    postComment: jest.fn(),
    updateSent: jest.fn(),
    forumDiscussionCreated: jest.fn(),
    applicationCreated: jest.fn(),
    communityNewMember: jest.fn(),
    userRegistered: jest.fn(),
  },
};
