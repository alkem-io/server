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
      `Getting notification recipients for: ${JSON.stringify(eventData)}`,
      LogContext.NOTIFICATIONS
    );

    const inAppEnabledForEventType = this.isInAppEnabled(eventData.eventType);
    const { privilegeRequired, credentialCriteria } =
      this.getPrivilegeRequiredCredentialCriteria(
        eventData.eventType,
        eventData.entityID
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
            agent: {
              credentials: true,
            },
          },
        }
      );

    const recipientsWithNotificationEnabled = candidateRecipients.filter(
      recipient =>
        this.isNotificationEnabled(
          eventData.eventType,
          recipient.settings?.notification
        )
    );

    // Filter out recipients who do not have the required privilege
    let recipientsWithPrivilege = recipientsWithNotificationEnabled;
    if (privilegeRequired && recipientsWithNotificationEnabled.length > 0) {
      const privilege = privilegeRequired;
      const authorizationPolicy = await this.getAuthorizationPolicy(
        eventData.eventType,
        eventData.entityID
      );
      recipientsWithPrivilege = recipientsWithNotificationEnabled.filter(
        recipient =>
          this.authorizationService.isAccessGrantedForCredentials(
            recipient.agent.credentials || [],
            [],
            authorizationPolicy,
            privilege
          )
      );
    }

    // TODO: check checkIsUserMessagingAllowed??

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
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_RECIPIENT:
        return notificationSettings.space.applicationReceived;
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
        return notificationSettings.space.applicationSubmitted;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        return notificationSettings.space.communicationUpdates;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
        return notificationSettings.space.communicationUpdatesAdmin;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
        return notificationSettings.space.communityNewMember;
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
        return notificationSettings.space.communityNewMemberAdmin;
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
        return notificationSettings.space.communityInvitationUser;
      case NotificationEvent.SPACE_POST_CREATED_ADMIN:
        return notificationSettings.space.postCreatedAdmin;
      case NotificationEvent.SPACE_POST_CREATED:
        return notificationSettings.space.postCreated;
      case NotificationEvent.SPACE_POST_COMMENT_CREATED:
        return notificationSettings.space.postCommentCreated;
      case NotificationEvent.SPACE_WHITEBOARD_CREATED:
        return notificationSettings.space.whiteboardCreated;
      case NotificationEvent.SPACE_CALLOUT_PUBLISHED:
        return notificationSettings.space.calloutPublished;

      default:
        throw new ValidationException(
          `Unknown notification event type: ${eventType}`,
          LogContext.NOTIFICATIONS
        );
    }
  }

  private getPrivilegeRequiredCredentialCriteria(
    eventType: NotificationEvent,
    entityID?: string
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
        credentialCriteria = this.getOrganizationCredentialCriteria(entityID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_RECIPIENT: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(entityID);
        credentialCriteria.push({
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        });
        break;
      }
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case NotificationEvent.SPACE_POST_CREATED_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(entityID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_POST_CREATED:
      case NotificationEvent.SPACE_WHITEBOARD_CREATED:
      case NotificationEvent.SPACE_CALLOUT_PUBLISHED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(entityID);
        break;
      }
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_APPLICANT:
      case NotificationEvent.USER_MENTION:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.SPACE_POST_COMMENT_CREATED: {
        credentialCriteria = this.getUserSelfCriteria(entityID);
        break;
      }
    }
    this.logger.verbose?.(
      `event: ${eventType}, Privilege required: ${privilegeRequired}, Credential criteria: ${JSON.stringify(
        credentialCriteria
      )}`,
      LogContext.NOTIFICATIONS
    );
    return { privilegeRequired, credentialCriteria };
  }

  private isInAppEnabled(eventType: NotificationEvent): boolean {
    switch (eventType) {
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.USER_MENTION:
      case NotificationEvent.SPACE_CALLOUT_PUBLISHED:
        return true;
      default:
        return false;
    }
  }
  private async getAuthorizationPolicy(
    eventType: NotificationEvent,
    entityID?: string
  ): Promise<IAuthorizationPolicy> {
    switch (eventType) {
      case NotificationEvent.PLATFORM_SPACE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_USER_PROFILE_REMOVED: {
        // get the platform authorization policy
        return await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      }
      case NotificationEvent.ORGANIZATION_MESSAGE_RECIPIENT:
      case NotificationEvent.ORGANIZATION_MENTIONED: {
        // get the organization authorization policy
        if (!entityID) {
          throw new ValidationException(
            'Entity ID is required for organization notification recipients',
            LogContext.NOTIFICATIONS
          );
        }
        const organization =
          await this.organizationLookupService.getOrganizationOrFail(entityID);
        if (!organization.authorization) {
          throw new RelationshipNotFoundException(
            `Organization does not have an authorization policy: ${organization.id}`,
            LogContext.NOTIFICATIONS
          );
        }
        return organization.authorization;
      }
      case NotificationEvent.SPACE_COMMUNITY_APPLICATION_RECIPIENT:
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE_ADMIN:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case NotificationEvent.SPACE_POST_CREATED_ADMIN:
      case NotificationEvent.SPACE_POST_CREATED:
      case NotificationEvent.SPACE_POST_COMMENT_CREATED:
      case NotificationEvent.SPACE_WHITEBOARD_CREATED:
      case NotificationEvent.SPACE_CALLOUT_PUBLISHED:
      case NotificationEvent.USER_MENTION:
      case NotificationEvent.USER_COMMENT_REPLY: {
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
