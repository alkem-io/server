import { IUserSettings } from '@domain/community/user-settings/user.settings.interface';

export const userSettingsData: { userSettings: IUserSettings } = {
  userSettings: {
    id: '1',
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    privacy: {
      contributionRolesPubliclyVisible: true,
    },
    communication: {
      allowOtherUsersToSendMessages: true,
    },
    notification: {
      space: {
        adminCommunityApplicationReceived: true,
        communityApplicationSubmitted: true,
        communityNewMember: true,
        adminCommunityNewMember: true,
        communityInvitationUser: true,
        communicationUpdates: true,
        communicationUpdatesAdmin: true,
        communicationMessage: true,
        communicationMessageAdmin: true,
        adminCollaborationContributionCreated: true,
        collaborationCalloutPostContributionComment: true,
        collaborationCalloutContributionCreated: true,
        collaborationCalloutComment: true,
        collaborationCalloutPublished: true,
      },
      platform: {
        adminUserProfileRemoved: true,
        adminUserProfileCreated: true,
        forumDiscussionComment: true,
        forumDiscussionCreated: true,
        adminSpaceCreated: true,
      },
      organization: {
        adminMentioned: true,
        adminMessageReceived: true,
      },
      user: {
        commentReply: true,
        mentioned: true,
        messageReceived: true,
        copyOfMessageSent: true,
      },
    },
  },
};
