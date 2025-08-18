import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';
import { NotificationEvent } from '@common/enums/notification.event';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IUserSettingsNotification } from '@domain/community/user-settings/user.settings.notification.interface';

export class NotificationRecipientsService {
  constructor(
    private userLookupService: UserLookupService,
    private spaceLookupService: SpaceLookupService,
    private organizationLookupService: OrganizationLookupService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getRecipients(
    eventData: NotificationRecipientsInput
  ): Promise<NotificationRecipientResult> {
    this.logger.verbose?.(
      `[${eventData.eventType}] - Getting notification recipients: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const inAppEnabledForEventType = this.isInAppEnabled(eventData.eventType);
    const { privilegeRequired, credentialCriteria } =
      this.getPrivilegeRequiredCredentialCriteria(
        eventData.eventType,
        eventData.spaceID,
        eventData.userID,
        eventData.organizationID
      );

    this.logger.verbose?.(
      `[${eventData.eventType}] - 1. Privilege required: ${privilegeRequired}, Credential criteria: ${JSON.stringify(
        credentialCriteria
      )}`,
      LogContext.NOTIFICATIONS
    );

    // Note: the candidate recipients are set to a level that is greater than or equal to the end set of recipients
    // The final list of recipients will be filtered based on the privilege required
    const candidateRecipients =
      await this.userLookupService.usersWithCredentials(
        credentialCriteria,
        undefined,
        {
          relations: {
            settings: true,
          },
        }
      );

    this.logger.verbose?.(
      `[${eventData.eventType}] - 2. ...identified ${candidateRecipients.length} potential recipients matching criteria`,
      LogContext.NOTIFICATIONS
    );

    const recipientsWithNotificationEnabled = candidateRecipients.filter(
      recipient =>
        this.isNotificationEnabled(
          eventData.eventType,
          recipient.settings?.notification
        )
    );
    this.logger.verbose?.(
      `[${eventData.eventType}] - 3. ...${recipientsWithNotificationEnabled.length} of which have this notification enabled`,
      LogContext.NOTIFICATIONS
    );

    // Need to reload the users to get the full set of credentials for use in authorization evaluation
    // TODO: this can clearly be optimized to have one lookup of the users, not two...
    const candidateRecipientIDs = candidateRecipients.map(
      recipient => recipient.id
    );
    const recipientsWithNotificationEnabledWithCredentials =
      await this.userLookupService.getUsersByUUID(candidateRecipientIDs, {
        relations: {
          settings: true,
          profile: true,
          agent: {
            credentials: true,
          },
        },
      });

    // Filter out recipients who do not have the required privilege
    let recipientsWithPrivilege =
      recipientsWithNotificationEnabledWithCredentials;
    if (
      privilegeRequired &&
      recipientsWithNotificationEnabledWithCredentials.length > 0
    ) {
      const privilege = privilegeRequired;
      const authorizationPolicy = await this.getAuthorizationPolicy(
        eventData.eventType,
        eventData.spaceID,
        eventData.userID,
        eventData.organizationID
      );
      recipientsWithPrivilege =
        recipientsWithNotificationEnabledWithCredentials.filter(recipient => {
          const credentials = recipient.agent.credentials;
          if (!credentials) {
            throw new RelationshipNotFoundException(
              `User ${recipient.id} does not have agent with credentials`,
              LogContext.NOTIFICATIONS
            );
          }
          const accessGranted =
            this.authorizationService.isAccessGrantedForCredentials(
              credentials,
              [],
              authorizationPolicy,
              privilege
            );
          if (accessGranted) {
            return recipient;
          }
        });
    }

    this.logger.verbose?.(
      `[${eventData.eventType}] - 4. ...and of those ${recipientsWithPrivilege.length} have the '${privilegeRequired}' privilege`,
      LogContext.NOTIFICATIONS
    );

    const inAppParticipantCandidates = inAppEnabledForEventType
      ? recipientsWithPrivilege
      : [];
    // Filter by whether they have the InApp privilege on platform level
    const authorizationPolicyForInApp =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    const inAppRecipientsWithPrivilege = inAppParticipantCandidates.filter(
      recipient =>
        this.authorizationService.isAccessGrantedForCredentials(
          recipient.agent.credentials || [],
          [],
          authorizationPolicyForInApp,
          AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_IN_APP
        )
    );
    const triggeredBy = eventData.triggeredBy
      ? await this.userLookupService.getUserOrFail(eventData.triggeredBy)
      : undefined;

    this.logger.verbose?.(
      `[${eventData.eventType}] - 5. Email has ${recipientsWithPrivilege.length} recipients; InApp has ${inAppRecipientsWithPrivilege.length} recipients`,
      LogContext.NOTIFICATIONS
    );

    return {
      emailRecipients: recipientsWithPrivilege,
      inAppRecipients: inAppRecipientsWithPrivilege,
      triggeredBy,
    };
  }

  private isNotificationEnabled(
    eventType: NotificationEvent,
    notificationSettings: IUserSettingsNotification
  ): boolean {
    switch (eventType) {
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED:
        return notificationSettings.platform.forumDiscussionCreated;
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
        return notificationSettings.platform.forumDiscussionComment;
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
        return notificationSettings.platform.newUserSignUp;
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED:
        return notificationSettings.platform.userProfileRemoved;
      case NotificationEvent.PLATFORM_SPACE_CREATED:
        return notificationSettings.platform.spaceCreated;
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT:
        return notificationSettings.organization.messageReceived;
      case NotificationEvent.ORGANIZATION_MENTIONED:
        return notificationSettings.organization.mentioned;
      case NotificationEvent.USER_COMMENT_REPLY:
        return notificationSettings.user.commentReply;
      case NotificationEvent.USER_MENTION:
        return notificationSettings.user.mentioned;
      case NotificationEvent.USER_MESSAGE_RECIPIENT:
        return notificationSettings.user.messageReceived;
      case NotificationEvent.USER_MESSAGE_SENDER:
        return notificationSettings.user.messageSent;
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN:
        return notificationSettings.space.communityApplicationReceived;
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
        return notificationSettings.space.communityApplicationSubmitted;
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
        return notificationSettings.space.communityInvitationUser;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        return notificationSettings.space.communicationUpdates;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
        return notificationSettings.space.communicationUpdatesAdmin;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
        return notificationSettings.space.communityNewMember;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
        return notificationSettings.space.communityNewMemberAdmin;
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN:
        return notificationSettings.space.collaborationPostCreatedAdmin;
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED:
        return notificationSettings.space.collaborationPostCreated;
      case NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED:
        return notificationSettings.space.collaborationPostCommentCreated;
      case NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED:
        return notificationSettings.space.collaborationWhiteboardCreated;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        return notificationSettings.space.collaborationCalloutPublished;
      // ALways true!
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        return true;

      default:
        throw new ValidationException(
          `Unknown notification event type: ${eventType}`,
          LogContext.NOTIFICATIONS
        );
    }
  }

  private getPrivilegeRequiredCredentialCriteria(
    eventType: NotificationEvent,
    spaceID?: string,
    userID?: string,
    organizationID?: string
  ): {
    privilegeRequired: AuthorizationPrivilege | undefined;
    credentialCriteria: CredentialsSearchInput[];
  } {
    // 1. Depending on the event type, get a) the candidate list of recipients b) the privilege required per recipient c) whether inApp is enabled or not
    // 2. Filter the candidate list based on the privilege required
    let privilegeRequired: AuthorizationPrivilege | undefined = undefined;
    let credentialCriteria: CredentialsSearchInput[] = [];
    switch (eventType) {
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED: {
        // All users can receive these notifications
        credentialCriteria = [
          {
            type: AuthorizationCredential.GLOBAL_REGISTERED,
            resourceID: '',
          },
        ];
        break;
      }
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getGlobalAdminCriteria();
        break;
      }
      case NotificationEvent.PLATFORM_SPACE_CREATED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = [
          {
            type: AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
            resourceID: '',
          },
        ];
        break;
      }
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT:
      case NotificationEvent.ORGANIZATION_MENTIONED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria =
          this.getOrganizationCredentialCriteria(organizationID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
        credentialCriteria.push({
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        });
        break;
      }
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
        break;
      }
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
      case NotificationEvent.USER_MENTION:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getUserSelfCriteria(userID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER: {
        // For direct user invitations, no privilege check is needed - just check if the user exists and has notifications enabled
        credentialCriteria = this.getUserSelfCriteria(userID);
        break;
      }
    }
    return { privilegeRequired, credentialCriteria };
  }

  private isInAppEnabled(eventType: NotificationEvent): boolean {
    switch (eventType) {
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN:
      case NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED:
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT: {
        return true;
      }
      case NotificationEvent.USER_MENTION:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.USER_MESSAGE_RECIPIENT: {
        return true;
      }
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT: {
        return true;
      }
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN:
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED:
      case NotificationEvent.PLATFORM_SPACE_CREATED: {
        return true;
      }
      default:
        return false;
    }
  }
  private async getAuthorizationPolicy(
    eventType: NotificationEvent,
    entityID?: string,
    userID?: string,
    organizationID?: string
  ): Promise<IAuthorizationPolicy> {
    switch (eventType) {
      case NotificationEvent.PLATFORM_SPACE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN:
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED: {
        // get the platform authorization policy
        return await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      }
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT:
      case NotificationEvent.ORGANIZATION_MENTIONED: {
        // get the organization authorization policy
        if (!organizationID) {
          throw new ValidationException(
            'Entity ID is required for organization notification recipients',
            LogContext.NOTIFICATIONS
          );
        }
        const organization =
          await this.organizationLookupService.getOrganizationOrFail(
            organizationID
          );
        if (!organization.authorization) {
          throw new RelationshipNotFoundException(
            `Organization does not have an authorization policy: ${organization.id}`,
            LogContext.NOTIFICATIONS
          );
        }
        return organization.authorization;
      }

      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_ADMIN:
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED_ADMIN:
      case NotificationEvent.SPACE_COLLABORATION_POST_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_POST_COMMENT_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_WHITEBOARD_CREATED:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED: {
        // get the space authorization policy
        if (!entityID) {
          throw new ValidationException(
            'Entity ID is required for space notification recipients',
            LogContext.NOTIFICATIONS
          );
        }
        const space = await this.spaceLookupService.getSpaceOrFail(entityID);
        if (!space.authorization) {
          throw new RelationshipNotFoundException(
            `Space does not have an authorization policy: ${space.id}`,
            LogContext.NOTIFICATIONS
          );
        }
        return space.authorization;
      }

      case NotificationEvent.USER_MENTION:
      case NotificationEvent.USER_MESSAGE_RECIPIENT:
      case NotificationEvent.USER_MESSAGE_SENDER:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER: {
        // get the User authorization policy
        // Use userID if provided, otherwise fall back to entityID for backward compatibility
        const targetUserID = userID || entityID;
        if (!targetUserID) {
          throw new ValidationException(
            'User ID is required for user notification recipients',
            LogContext.NOTIFICATIONS
          );
        }
        const user = await this.userLookupService.getUserOrFail(targetUserID);
        if (!user.authorization) {
          throw new RelationshipNotFoundException(
            `User does not have an authorization policy: ${user.id}`,
            LogContext.NOTIFICATIONS
          );
        }
        return user.authorization;
      }

      default:
        // For other events, no specific authorization policy is needed
        // or the event does not require a specific policy
        throw new ValidationException(
          `No authorization policy needed for event type: ${eventType}`,
          LogContext.NOTIFICATIONS
        );
    }
  }

  private getOrganizationCredentialCriteria(
    organizationID: string | undefined
  ): CredentialsSearchInput[] {
    if (!organizationID) {
      throw new ValidationException(
        'Organization ID is required for notification recipients',
        LogContext.NOTIFICATIONS
      );
    }
    // Organization associates could potentially receive these notifications; control via authorization policy
    // that assigns the right privilege
    return [
      {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: organizationID,
      },
    ];
  }

  private getSpaceCredentialCriteria(
    spaceID: string | undefined
  ): CredentialsSearchInput[] {
    if (!spaceID) {
      throw new ValidationException(
        'Space ID is required for notification recipients',
        LogContext.NOTIFICATIONS
      );
    }
    return [
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: spaceID,
      },
    ];
  }

  private getUserSelfCriteria(
    userID: string | undefined
  ): CredentialsSearchInput[] {
    if (!userID) {
      throw new ValidationException(
        'User ID is required for notification recipients',
        LogContext.NOTIFICATIONS
      );
    }
    return [
      {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: userID,
      },
    ];
  }

  private getGlobalAdminCriteria(): CredentialsSearchInput[] {
    return [
      {
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      },
      {
        type: AuthorizationCredential.GLOBAL_SUPPORT,
        resourceID: '',
      },
    ];
  }
}
