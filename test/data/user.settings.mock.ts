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
            push: true,
          },
          communityNewMember: {
            email: true,
            inApp: true,
            push: true,
          },
          communicationMessageReceived: {
            email: true,
            inApp: true,
            push: true,
          },
          collaborationCalloutContributionCreated: {
            email: true,
            inApp: true,
            push: true,
          },
        },

        communicationUpdates: {
          email: true,
          inApp: true,
          push: true,
        },

        collaborationCalloutPostContributionComment: {
          email: true,
          inApp: true,
          push: true,
        },
        collaborationCalloutContributionCreated: {
          email: true,
          inApp: true,
          push: true,
        },
        collaborationCalloutComment: {
          email: true,
          inApp: true,
          push: true,
        },
        collaborationCalloutPublished: {
          email: true,
          inApp: true,
          push: true,
        },
        communityCalendarEvents: {
          email: true,
          inApp: true,
          push: true,
        },
        collaborationPollVoteCastOnOwnPoll: {
          email: false,
          inApp: true,
          push: false,
        },
        collaborationPollVoteCastOnPollIVotedOn: {
          email: false,
          inApp: true,
          push: false,
        },
        collaborationPollModifiedOnPollIVotedOn: {
          email: false,
          inApp: true,
          push: false,
        },
        collaborationPollVoteAffectedByOptionChange: {
          email: false,
          inApp: true,
          push: false,
        },
      },
      platform: {
        admin: {
          userProfileRemoved: {
            email: true,
            inApp: true,
            push: true,
          },
          userProfileCreated: {
            email: true,
            inApp: true,
            push: true,
          },
          spaceCreated: {
            email: true,
            inApp: true,
            push: true,
          },
          userGlobalRoleChanged: {
            email: true,
            inApp: true,
            push: true,
          },
        },

        forumDiscussionComment: {
          email: true,
          inApp: true,
          push: true,
        },
        forumDiscussionCreated: {
          email: true,
          inApp: true,
          push: true,
        },
      },
      organization: {
        adminMentioned: {
          email: true,
          inApp: true,
          push: true,
        },
        adminMessageReceived: {
          email: true,
          inApp: true,
          push: true,
        },
      },
      virtualContributor: {
        adminSpaceCommunityInvitation: {
          email: true,
          inApp: true,
          push: true,
        },
      },
      user: {
        commentReply: {
          email: true,
          inApp: true,
          push: true,
        },
        mentioned: {
          email: true,
          inApp: true,
          push: true,
        },
        messageReceived: {
          email: true,
          inApp: true,
          push: true,
        },
        membership: {
          spaceCommunityInvitationReceived: {
            email: true,
            inApp: true,
            push: true,
          },
          spaceCommunityJoined: {
            email: true,
            inApp: true,
            push: true,
          },
        },
      },
    },
    homeSpace: {
      spaceID: null,
      autoRedirect: false,
    },
    designVersion: 2,
  },
};
