import { ValueProvider } from '@nestjs/common';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockNotificationsPayloadBuilder: ValueProvider<
  PublicPart<NotificationExternalAdapter>
> = {
  provide: NotificationExternalAdapter,
  useValue: {
    buildUserMessageSentNotificationPayload: vi.fn(),
    buildSpaceCommunityApplicationCreatedNotificationPayload: vi.fn(),
    buildUserSpaceCommunityApplicationDeclinedPayload: vi.fn(),
    buildVirtualContributorSpaceCommunityInvitationDeclinedPayload: vi.fn(),
    buildNotificationPayloadUserSpaceCommunityInvitation: vi.fn(),
    buildSpaceCollaborationCreatedPayload: vi.fn(),
    buildSpaceCollaborationCalloutPostContributionCommentPayload: vi.fn(),
    buildPlatformForumDiscussionCreatedNotificationPayload: vi.fn(),
    buildSpaceCommunicationUpdateSentNotificationPayload: vi.fn(),
    buildSpaceCommunityNewMemberPayload: vi.fn(),
    buildPlatformUserRegisteredNotificationPayload: vi.fn(),
  },
};
