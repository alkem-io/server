import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';

export const MockNotificationPlatformAdapter: ValueProvider<
  PublicPart<NotificationPlatformAdapter>
> = {
  provide: NotificationPlatformAdapter,
  useValue: {
    platformForumDiscussionCreated: jest.fn(),
    platformUserRegistered: jest.fn(),
  },
};
