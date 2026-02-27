import { ValueProvider } from '@nestjs/common';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockNotificationPlatformAdapter: ValueProvider<
  PublicPart<NotificationPlatformAdapter>
> = {
  provide: NotificationPlatformAdapter,
  useValue: {
    platformForumDiscussionCreated: vi.fn(),
    platformUserProfileCreated: vi.fn(),
  },
};
