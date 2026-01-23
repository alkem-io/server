import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';

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
