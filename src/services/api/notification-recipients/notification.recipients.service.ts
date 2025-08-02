import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';
import { UserNotificationEvent } from '@common/enums/user.notification.event';
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

    const inAppEnabled = this.isInAppEnabled(eventData.eventType);

    // 1. Depending on the event type, get a) the candidate list of recipients b) the privilege required per recipient c) whether inApp is enabled or not
    // 2. Filter the candidate list based on the privilege required
    let privilegeRequired: AuthorizationPrivilege | undefined = undefined;
    let credentialCriteria: CredentialsSearchInput[] = [];
    switch (eventData.eventType) {
      case UserNotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT: {
        credentialCriteria = this.getUserSelfCriteria(eventData.entityID);
        break;
      }
      case UserNotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED: {
        // All users can receive these notifications
        credentialCriteria = [
          {
            type: AuthorizationCredential.GLOBAL_REGISTERED,
            resourceID: '',
          },
        ];
        break;
      }
      case UserNotificationEvent.PLATFORM_NEW_USER_SIGN_UP: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getGlobalAdminCriteria();
        break;
      }
      case UserNotificationEvent.PLATFORM_USER_PROFILE_REMOVED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getGlobalAdminCriteria();
        break;
      }
      case UserNotificationEvent.PLATFORM_SPACE_CREATED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = [
          {
            type: AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
            resourceID: '',
          },
        ];
        break;
      }
      case UserNotificationEvent.ORGANIZATION_MESSAGE_RECEIVED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getOrganizationCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.ORGANIZATION_MENTIONED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getOrganizationCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_APPLICATION_RECEIVED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }

      case UserNotificationEvent.SPACE_APPLICATION_SUBMITTED: {
        credentialCriteria = this.getUserSelfCriteria(eventData.entityID);
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNICATION_UPDATES: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNICATION_UPDATES_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNITY_NEW_MEMBER: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNITY_INVITATION_USER: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_POST_CREATED_ADMIN: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_POST_CREATED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_POST_COMMENT_CREATED: {
        // Post creator can receive these notifications
        credentialCriteria = this.getUserSelfCriteria(eventData.entityID);
        break;
      }
      case UserNotificationEvent.SPACE_WHITEBOARD_CREATED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_CALLOUT_PUBLISHED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(
          eventData.entityID
        );
        break;
      }
      case UserNotificationEvent.SPACE_COMMUNICATION_MENTION: {
        // Mentioned user can receive these notifications
        credentialCriteria = this.getUserSelfCriteria(eventData.entityID);
        break;
      }
      case UserNotificationEvent.SPACE_COMMENT_REPLY: {
        // Comment creator can receive these notifications
        credentialCriteria = this.getUserSelfCriteria(eventData.entityID);
        break;
      }
    }

    // Note: the candidate recipients are set to a level that is greater than or equal to the end set of receipients
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

    // Filter out recipients who do not have the required privilege
    let recipientsWithPrivilege = candidateRecipients;
    if (privilegeRequired) {
      const privilege = privilegeRequired;
      const authorizationPolicy = await this.getAuthorizationPolicy(
        eventData.eventType,
        eventData.entityID
      );
      recipientsWithPrivilege = candidateRecipients.filter(recipient =>
        this.authorizationService.isAccessGrantedForCredentials(
          recipient.agent.credentials || [],
          [],
          authorizationPolicy,
          privilege
        )
      );
    }
    const inAppParticipants = inAppEnabled ? recipientsWithPrivilege : [];

    // Implement your logic to retrieve notification recipients here
    return {
      emailRecipients: recipientsWithPrivilege,
      inAppRecipients: inAppParticipants,
    };
  }

  private isInAppEnabled(eventType: UserNotificationEvent): boolean {
    switch (eventType) {
      case UserNotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case UserNotificationEvent.SPACE_COMMUNICATION_MENTION:
      case UserNotificationEvent.SPACE_CALLOUT_PUBLISHED:
        return true;
      default:
        return false;
    }
  }
  private async getAuthorizationPolicy(
    eventType: UserNotificationEvent,
    entityID?: string
  ): Promise<IAuthorizationPolicy> {
    switch (eventType) {
      case UserNotificationEvent.PLATFORM_SPACE_CREATED:
      case UserNotificationEvent.PLATFORM_NEW_USER_SIGN_UP:
      case UserNotificationEvent.PLATFORM_USER_PROFILE_REMOVED: {
        // get the platform authorization policy
        return await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      }
      case UserNotificationEvent.ORGANIZATION_MESSAGE_RECEIVED:
      case UserNotificationEvent.ORGANIZATION_MENTIONED: {
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
      case UserNotificationEvent.SPACE_APPLICATION_RECEIVED:
      case UserNotificationEvent.SPACE_COMMUNITY_INVITATION_USER:
      case UserNotificationEvent.SPACE_COMMUNICATION_UPDATES:
      case UserNotificationEvent.SPACE_COMMUNICATION_UPDATES_ADMIN:
      case UserNotificationEvent.SPACE_COMMUNITY_NEW_MEMBER:
      case UserNotificationEvent.SPACE_COMMUNITY_NEW_MEMBER_ADMIN:
      case UserNotificationEvent.SPACE_POST_CREATED_ADMIN:
      case UserNotificationEvent.SPACE_POST_CREATED:
      case UserNotificationEvent.SPACE_POST_COMMENT_CREATED:
      case UserNotificationEvent.SPACE_WHITEBOARD_CREATED:
      case UserNotificationEvent.SPACE_CALLOUT_PUBLISHED:
      case UserNotificationEvent.SPACE_COMMUNICATION_MENTION:
      case UserNotificationEvent.SPACE_COMMENT_REPLY: {
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
