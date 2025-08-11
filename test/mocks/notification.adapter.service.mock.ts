import { ValueProvider } from '@nestjs/common';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { PublicPart } from '../utils/public-part';

export const MockNotificationAdapter: ValueProvider<
  PublicPart<NotificationAdapter>
> = {
  provide: NotificationAdapter,
  useValue: {
    SpaceCollaborationCalloutPublished: jest.fn(),
    spaceCollaborationPostCreated: jest.fn(),
    spaceCollaborationPostComment: jest.fn(),
    spaceCommunicationUpdateSent: jest.fn(),
    platformForumDiscussionCreated: jest.fn(),
    spaceCommunityApplicationCreated: jest.fn(),
    spaceCommunityNewMember: jest.fn(),
    platfromUserRegistered: jest.fn(),
  },
};
