import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationChannels1755929043483 implements MigrationInterface {
  name = 'NotificationChannels1755929043483';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userSettings: {
      id: string;
      notification: LegacyNotificationSettings;
    }[] = await queryRunner.query(`SELECT id, notification FROM user_settings`);

    for (const userSetting of userSettings) {
      const legacyNotificationSettings: LegacyNotificationSettings =
        userSetting.notification;
      const newNotificationSettings: NewNotificationSettings = {
        platform: {
          // Map legacy platform fields to new structure
          admin: {
            userProfileRemoved: {
              email: legacyNotificationSettings.platform.userProfileRemoved,
              inApp: legacyNotificationSettings.platform.userProfileRemoved,
            },
            userProfileCreated: {
              email: legacyNotificationSettings.platform.newUserSignUp,
              inApp: legacyNotificationSettings.platform.newUserSignUp,
            },
            spaceCreated: {
              email: legacyNotificationSettings.platform.spaceCreated,
              inApp: legacyNotificationSettings.platform.spaceCreated,
            },
            userGlobalRoleChanged: {
              email: true,
              inApp: true,
            },
          },
          forumDiscussionComment: {
            email: legacyNotificationSettings.platform.forumDiscussionComment,
            inApp: legacyNotificationSettings.platform.forumDiscussionComment,
          },
          forumDiscussionCreated: {
            email: legacyNotificationSettings.platform.forumDiscussionCreated,
            inApp: legacyNotificationSettings.platform.forumDiscussionCreated,
          },
        },
        organization: {
          // Map legacy organization fields to new structure
          adminMentioned: {
            email: legacyNotificationSettings.organization.mentioned,
            inApp: legacyNotificationSettings.organization.mentioned,
          },
          adminMessageReceived: {
            email: legacyNotificationSettings.organization.messageReceived,
            inApp: legacyNotificationSettings.organization.messageReceived,
          },
        },
        space: {
          // Map legacy space fields to new structure
          admin: {
            communityApplicationReceived: {
              email:
                legacyNotificationSettings.space.communityApplicationReceived,
              inApp:
                legacyNotificationSettings.space.communityApplicationReceived,
            },
            collaborationCalloutContributionCreated: {
              email:
                legacyNotificationSettings.space.collaborationPostCreatedAdmin,
              inApp:
                legacyNotificationSettings.space.collaborationPostCreatedAdmin,
            },
            communityNewMember: {
              email: legacyNotificationSettings.space.communityNewMemberAdmin,
              inApp: legacyNotificationSettings.space.communityNewMemberAdmin,
            },
            communicationMessageReceived: {
              email: legacyNotificationSettings.space.communicationMessageAdmin,
              inApp: legacyNotificationSettings.space.communicationMessageAdmin,
            },
          },
          collaborationCalloutContributionCreated: {
            email: legacyNotificationSettings.space.collaborationPostCreated,
            inApp: legacyNotificationSettings.space.collaborationPostCreated,
          },
          communicationUpdates: {
            email: legacyNotificationSettings.space.communicationUpdates,
            inApp: legacyNotificationSettings.space.communicationUpdates,
          },
          collaborationCalloutPublished: {
            email:
              legacyNotificationSettings.space.collaborationCalloutPublished,
            inApp:
              legacyNotificationSettings.space.collaborationCalloutPublished,
          },
          collaborationCalloutComment: {
            email: true,
            inApp: true,
          },
          collaborationCalloutPostContributionComment: {
            email:
              legacyNotificationSettings.space.collaborationPostCommentCreated,
            inApp:
              legacyNotificationSettings.space.collaborationPostCommentCreated,
          },
        },
        user: {
          // Map legacy user fields to new structure
          membership: {
            spaceCommunityInvitationReceived: {
              email: legacyNotificationSettings.space.communityInvitationUser,
              inApp: legacyNotificationSettings.space.communityInvitationUser,
            },
            spaceCommunityJoined: {
              email: legacyNotificationSettings.space.communityNewMember,
              inApp: legacyNotificationSettings.space.communityNewMember,
            },
            spaceCommunityApplicationSubmitted: {
              email:
                legacyNotificationSettings.space.communityApplicationSubmitted,
              inApp:
                legacyNotificationSettings.space.communityApplicationSubmitted,
            },
          },
          mentioned: {
            email: legacyNotificationSettings.user.mentioned,
            inApp: legacyNotificationSettings.user.mentioned,
          },
          commentReply: {
            email: legacyNotificationSettings.user.commentReply,
            inApp: legacyNotificationSettings.user.commentReply,
          },
          messageReceived: {
            email: legacyNotificationSettings.user.messageReceived,
            inApp: legacyNotificationSettings.user.messageReceived,
          },
          copyOfMessageSent: {
            email: legacyNotificationSettings.user.messageSent,
            inApp: legacyNotificationSettings.user.messageSent,
          },
        },
        virtualContributor: {
          adminSpaceCommunityInvitation: {
            email: true,
            inApp: true,
          },
        },
      };
      // update the user settings with the new settings
      await queryRunner.query(
        `UPDATE user_settings SET notification = ? WHERE id = ?`,
        [JSON.stringify(newNotificationSettings), userSetting.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

interface LegacyNotificationPlatform {
  userProfileRemoved: boolean;
  newUserSignUp: boolean;
  forumDiscussionComment: boolean;
  forumDiscussionCreated: boolean;
  spaceCreated: boolean;
}

interface LegacyNotificationOrganization {
  mentioned: boolean;
  messageReceived: boolean;
}

interface LegacyNotificationSpace {
  communityApplicationReceived: boolean;
  communityApplicationSubmitted: boolean;
  communityInvitationUser: boolean;
  communityNewMember: boolean;
  communityNewMemberAdmin: boolean;
  communicationUpdates: boolean;
  communicationUpdatesAdmin: boolean;
  communicationMessage: boolean;
  communicationMessageAdmin: boolean;
  collaborationPostCommentCreated: boolean;
  collaborationCalloutPublished: boolean;
  collaborationPostCreated: boolean;
  collaborationPostCreatedAdmin: boolean;
  collaborationWhiteboardCreated: boolean;
}

interface LegacyNotificationUser {
  mentioned: boolean;
  commentReply: boolean;
  messageReceived: boolean;
  messageSent: boolean;
}

interface LegacyNotificationSettings {
  platform: LegacyNotificationPlatform;
  organization: LegacyNotificationOrganization;
  space: LegacyNotificationSpace;
  user: LegacyNotificationUser;
}

// New notification settings structure with channel objects
interface NotificationChannels {
  email: boolean;
  inApp: boolean;
}

interface NewNotificationPlatform {
  admin: {
    userProfileRemoved: NotificationChannels;
    userProfileCreated: NotificationChannels;
    spaceCreated: NotificationChannels;
    userGlobalRoleChanged: NotificationChannels;
  };
  forumDiscussionComment: NotificationChannels;
  forumDiscussionCreated: NotificationChannels;
}

interface NewNotificationOrganization {
  adminMentioned: NotificationChannels;
  adminMessageReceived: NotificationChannels;
}

interface NewNotificationSpace {
  // Admin related notifications
  admin: {
    communityApplicationReceived: NotificationChannels;
    collaborationCalloutContributionCreated: NotificationChannels;
    communityNewMember: NotificationChannels;
    communicationMessageReceived: NotificationChannels;
  };
  // Member related notifications
  collaborationCalloutContributionCreated: NotificationChannels;
  communicationUpdates: NotificationChannels;
  collaborationCalloutPublished: NotificationChannels;
  collaborationCalloutComment: NotificationChannels;
  collaborationCalloutPostContributionComment: NotificationChannels;
}

interface NewNotificationUser {
  membership: {
    spaceCommunityInvitationReceived: NotificationChannels;
    spaceCommunityJoined: NotificationChannels;
    spaceCommunityApplicationSubmitted: NotificationChannels;
  };
  mentioned: NotificationChannels;
  commentReply: NotificationChannels;
  messageReceived: NotificationChannels;
  copyOfMessageSent: NotificationChannels;
}

interface NewNotificationVirtualContributor {
  adminSpaceCommunityInvitation: NotificationChannels;
}

interface NewNotificationSettings {
  platform: NewNotificationPlatform;
  organization: NewNotificationOrganization;
  space: NewNotificationSpace;
  user: NewNotificationUser;
  virtualContributor: NewNotificationVirtualContributor;
}
