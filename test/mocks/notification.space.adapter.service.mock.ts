import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';

export const MockNotificationSpaceAdapter: ValueProvider<
  PublicPart<NotificationSpaceAdapter>
> = {
  provide: NotificationSpaceAdapter,
  useValue: {
    spaceCollaborationCalloutPublished: jest.fn(),
    spaceCollaborationCalloutContributionCreated: jest.fn(),
    spaceCollaborationCalloutPostContributionComment: jest.fn(),
    spaceCommunicationUpdate: jest.fn(),
    spaceCommunityApplicationCreated: jest.fn(),
    spaceCommunityNewMember: jest.fn(),
  },
};
