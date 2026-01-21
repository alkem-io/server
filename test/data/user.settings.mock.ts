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
        admin: {
          communityApplicationReceived: {
            email: true,
            inApp: true,
          },
          communityNewMember: {
            email: true,
            inApp: true,
          },
          communicationMessageReceived: {
            email: true,
            inApp: true,
          },
          collaborationCalloutContributionCreated: {
            email: true,
            inApp: true,
          },
        },

        communicationUpdates: {
          email: true,
          inApp: true,
        },

        collaborationCalloutPostContributionComment: {
          email: true,
          inApp: true,
        },
        collaborationCalloutContributionCreated: {
          email: true,
          inApp: true,
        },
        collaborationCalloutComment: {
          email: true,
          inApp: true,
        },
        collaborationCalloutPublished: {
          email: true,
          inApp: true,
        },
        communityCalendarEvents: {
          email: true,
          inApp: true,
        },
      },
      platform: {
        admin: {
          userProfileRemoved: {
            email: true,
            inApp: true,
          },
          userProfileCreated: {
            email: true,
            inApp: true,
          },
          spaceCreated: {
            email: true,
            inApp: true,
          },
          userGlobalRoleChanged: {
            email: true,
            inApp: true,
          },
        },

        forumDiscussionComment: {
          email: true,
          inApp: true,
        },
        forumDiscussionCreated: {
          email: true,
          inApp: true,
        },
      },
      organization: {
        adminMentioned: {
          email: true,
          inApp: true,
        },
        adminMessageReceived: {
          email: true,
          inApp: true,
        },
      },
      virtualContributor: {
        adminSpaceCommunityInvitation: {
          email: true,
          inApp: true,
        },
      },
      user: {
        commentReply: {
          email: true,
          inApp: true,
        },
        mentioned: {
          email: true,
          inApp: true,
        },
        messageReceived: {
          email: true,
          inApp: true,
        },
        membership: {
          spaceCommunityInvitationReceived: {
            email: true,
            inApp: true,
          },
          spaceCommunityJoined: {
            email: true,
            inApp: true,
          },
        },
      },
    },
    homeSpace: {
      spaceID: null,
      autoRedirect: false,
    },
  },
};
