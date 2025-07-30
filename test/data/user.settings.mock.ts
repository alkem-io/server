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
        applicationReceived: true,
        applicationSubmitted: true,
        communicationUpdates: true,
        communicationUpdatesAdmin: true,
        communityNewMember: true,
        communityNewMemberAdmin: true,
        communityInvitationUser: true,
        postCreatedAdmin: true,
        postCommentCreated: true,
        postCreated: true,
        whiteboardCreated: true,
        calloutPublished: true,
        commentReply: true,
        communicationMention: true,
      },
      platform: {
        userProfileRemoved: true,
        newUserSignUp: true,
        forumDiscussionComment: true,
        forumDiscussionCreated: true,
      },
      organization: {
        mentioned: true,
        messageReceived: true,
      },
    },
  },
};
