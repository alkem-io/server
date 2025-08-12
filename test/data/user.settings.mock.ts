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
        communityApplicationReceived: true,
        communityApplicationSubmitted: true,
        communityNewMember: true,
        communityNewMemberAdmin: true,
        communityInvitationUser: true,
        communicationUpdates: true,
        communicationUpdatesAdmin: true,
        communicationMessage: true,
        communicationMessageAdmin: true,
        collaborationPostCreatedAdmin: true,
        collaborationPostCommentCreated: true,
        collaborationPostCreated: true,
        collaborationWhiteboardCreated: true,
        collaborationCalloutPublished: true,
      },
      platform: {
        userProfileRemoved: true,
        newUserSignUp: true,
        forumDiscussionComment: true,
        forumDiscussionCreated: true,
        spaceCreated: true,
      },
      organization: {
        mentioned: true,
        messageReceived: true,
      },
      user: {
        commentReply: true,
        mentioned: true,
        messageReceived: true,
        messageSent: true,
      },
    },
  },
};
