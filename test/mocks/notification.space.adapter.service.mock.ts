import { ValueProvider } from '@nestjs/common';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockNotificationSpaceAdapter: ValueProvider<
  PublicPart<NotificationSpaceAdapter>
> = {
  provide: NotificationSpaceAdapter,
  useValue: {
    spaceCollaborationCalloutPublished: vi.fn(),
    spaceCollaborationCalloutComment: vi.fn(),
    spaceCollaborationCalloutContributionCreated: vi.fn(),
    spaceCollaborationCalloutPostContributionComment: vi.fn(),
    spaceCommunicationUpdate: vi.fn(),
    spaceCommunityApplicationCreated: vi.fn(),
    spaceCommunityNewMember: vi.fn(),
  },
};
