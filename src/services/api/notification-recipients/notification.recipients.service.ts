import { Inject, Injectable, LoggerService } from '@nestjs/common';
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
import { NotificationEventException } from '@common/exceptions/notification.event.exception';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IUserSettingsNotificationChannels } from '@domain/community/user-settings/user.settings.notification.channels.interface';
import { IUser } from '@domain/community/user/user.interface';
@Injectable()
export class NotificationRecipientsService {
  constructor(
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
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

    const { privilegeRequired, credentialCriteria } =
      await this.getPrivilegeRequiredCredentialCriteria(
        eventData.eventType,
        eventData.spaceID,
        eventData.userID,
        eventData.organizationID,
        eventData.virtualContributorID
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

    const emailRecipientsWithNotificationEnabled = candidateRecipients.filter(
      recipient =>
        recipient.settings?.notification &&
        this.getChannelsSettingsForEvent(
          eventData.eventType,
          recipient.settings.notification
        ).email
    );
    const inAppRecipientsWithNotificationEnabled = candidateRecipients.filter(
      recipient =>
        recipient.settings?.notification &&
        this.getChannelsSettingsForEvent(
          eventData.eventType,
          recipient.settings.notification
        ).inApp
    );

    this.logger.verbose?.(
      `[${eventData.eventType}] - 3a. ...for email, ${emailRecipientsWithNotificationEnabled.length} have notification enabled`,
      LogContext.NOTIFICATIONS
    );
    this.logger.verbose?.(
      `[${eventData.eventType}] - 3b. ...for in-app, ${inAppRecipientsWithNotificationEnabled.length} have notification enabled`,
      LogContext.NOTIFICATIONS
    );

    // Filter out recipients who do not have the required privilege
    // TODO: this can clearly be optimized to have one lookup of the users, not two...
    const emailRecipientsWithPrivilege =
      await this.filterRecipientsWithPrivileges(
        emailRecipientsWithNotificationEnabled,
        privilegeRequired,
        eventData
      );
    const inAppRecipientsWithPrivilege =
      await this.filterRecipientsWithPrivileges(
        inAppRecipientsWithNotificationEnabled,
        privilegeRequired,
        eventData
      );

    this.logger.verbose?.(
      `[${eventData.eventType}] - 4a. ...and for email, of those ${emailRecipientsWithPrivilege.length} have the required privilege (${privilegeRequired || 'none'})`,
      LogContext.NOTIFICATIONS
    );
    this.logger.verbose?.(
      `[${eventData.eventType}] - 4b. ...and for in-app, of those ${inAppRecipientsWithPrivilege.length} have the required privilege (${privilegeRequired || 'none'})`,
      LogContext.NOTIFICATIONS
    );

    const triggeredBy = eventData.triggeredBy
      ? await this.userLookupService.getUserOrFail(eventData.triggeredBy)
      : undefined;

    if (!triggeredBy) {
      this.logger.verbose?.(
        `[${eventData.eventType}] - No triggeredBy provided!`,
        LogContext.NOTIFICATIONS
      );
    }

    this.logger.verbose?.(
      `[${eventData.eventType}] - 5a. Email has ${emailRecipientsWithPrivilege.length} recipients: ${emailRecipientsWithPrivilege.map(recipient => recipient.email).join(', ')}`,
      LogContext.NOTIFICATIONS
    );
    this.logger.verbose?.(
      `[${eventData.eventType}] - 5b. InApp has ${inAppRecipientsWithPrivilege.length} recipients: ${inAppRecipientsWithPrivilege.map(recipient => recipient.email).join(', ')}`,
      LogContext.NOTIFICATIONS
    );

    return {
      emailRecipients: emailRecipientsWithPrivilege,
      inAppRecipients: inAppRecipientsWithPrivilege,
      triggeredBy,
    };
  }

  private async filterRecipientsWithPrivileges(
    recipientsWithNotificationEnabled: IUser[],
    privilegeRequired: AuthorizationPrivilege | undefined,
    eventData: NotificationRecipientsInput
  ) {
    const recipientsWithNotificationEnabledIDs =
      recipientsWithNotificationEnabled.map(recipient => recipient.id);
    // Need to reload the users to get the full set of credentials for use in authorization evaluation
    const recipientsWithNotificationEnabledWithCredentials =
      await this.userLookupService.getUsersByUUID(
        recipientsWithNotificationEnabledIDs,
        {
          relations: {
            settings: true,
            profile: true,
            agent: {
              credentials: true,
            },
          },
        }
      );

    if (!privilegeRequired) {
      // No privilege required, return all
      return recipientsWithNotificationEnabledWithCredentials;
    }

    // Filter out recipients who do not have the required privilege
    let recipientsWithPrivilege =
      recipientsWithNotificationEnabledWithCredentials;
    if (recipientsWithNotificationEnabledWithCredentials.length > 0) {
      const authorizationPolicy = await this.getAuthorizationPolicy(
        eventData.eventType,
        eventData.spaceID,
        eventData.userID,
        eventData.organizationID,
        eventData.virtualContributorID
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
              privilegeRequired
            );
          if (accessGranted) {
            return recipient;
          }
        });
    }
    return recipientsWithPrivilege;
  }

  private getChannelsSettingsForEvent(
    eventType: NotificationEvent,
    notificationSettings: IUserSettingsNotification
  ): IUserSettingsNotificationChannels {
    switch (eventType) {
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED:
        return notificationSettings.platform.forumDiscussionCreated;
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
        return notificationSettings.platform.forumDiscussionComment;
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED:
        return notificationSettings.platform.admin.userProfileCreated;
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED:
        return notificationSettings.platform.admin.userProfileRemoved;
      case NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED:
        return notificationSettings.platform.admin.spaceCreated;
      case NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED:
        return notificationSettings.platform.admin.userGlobalRoleChanged;
      case NotificationEvent.ORGANIZATION_ADMIN_MESSAGE:
        return notificationSettings.organization.adminMessageReceived;
      case NotificationEvent.ORGANIZATION_ADMIN_MENTIONED:
        return notificationSettings.organization.adminMentioned;
      case NotificationEvent.USER_SPACE_COMMUNITY_INVITATION:
        return notificationSettings.user.membership
          .spaceCommunityInvitationReceived;
      case NotificationEvent.USER_SPACE_COMMUNITY_JOINED:
      case NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED:
      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION_DECLINED:
        return notificationSettings.user.membership.spaceCommunityJoined;
      case NotificationEvent.USER_COMMENT_REPLY:
        return notificationSettings.user.commentReply;
      case NotificationEvent.USER_MENTIONED:
        return notificationSettings.user.mentioned;
      case NotificationEvent.USER_MESSAGE:
        return notificationSettings.user.messageReceived;
      case NotificationEvent.USER_MESSAGE_SENDER:
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION:
        return notificationSettings.space.admin.communityApplicationReceived;
      case NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE:
        return notificationSettings.space.admin.communicationMessageReceived;
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
        return notificationSettings.space.communicationUpdates;
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER:
        return notificationSettings.space.admin.communityNewMember;
      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION:
        return notificationSettings.space.admin
          .collaborationCalloutContributionCreated;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION:
        return notificationSettings.space
          .collaborationCalloutContributionCreated;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT:
        return notificationSettings.space
          .collaborationCalloutPostContributionComment;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT:
        return notificationSettings.space.collaborationCalloutComment;
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED:
        return notificationSettings.space.collaborationCalloutPublished;
      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION:
        return notificationSettings.virtualContributor
          .adminSpaceCommunityInvitation;

      // Fixed values
      case NotificationEvent.USER_SIGN_UP_WELCOME:
        return {
          email: true,
          inApp: true,
        };
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
        return {
          email: true,
          inApp: false,
        };

      default:
        throw new NotificationEventException(
          `Unknown notification event type: ${eventType}`,
          LogContext.NOTIFICATIONS
        );
    }
  }

  private async getPrivilegeRequiredCredentialCriteria(
    eventType: NotificationEvent,
    spaceID?: string,
    userID?: string,
    organizationID?: string,
    virtualContributorID?: string
  ): Promise<{
    privilegeRequired: AuthorizationPrivilege | undefined;
    credentialCriteria: CredentialsSearchInput[];
  }> {
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
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED:
      case NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED:
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getGlobalAdminCriteria();
        break;
      }
      case NotificationEvent.ORGANIZATION_ADMIN_MESSAGE:
      case NotificationEvent.ORGANIZATION_ADMIN_MENTIONED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria =
          this.getOrganizationCredentialCriteria(organizationID);
        break;
      }
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceAdminCredentialCriteria(spaceID);
        credentialCriteria.push({
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        });
        break;
      }
      case NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE: {
        // no need to have the admin privilege, only LEAD
        credentialCriteria = this.getSpaceLeadCredentialCriteria(spaceID);
        break;
      }
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN;
        credentialCriteria = this.getSpaceAdminCredentialCriteria(spaceID);
        break;
      }
      case NotificationEvent.SPACE_COMMUNICATION_UPDATE:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria = this.getSpaceCredentialCriteria(spaceID);
        break;
      }
      case NotificationEvent.USER_SIGN_UP_WELCOME:
      case NotificationEvent.USER_MENTIONED:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.USER_MESSAGE:
      case NotificationEvent.USER_MESSAGE_SENDER:
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
      case NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED: {
        // For mentions, no privilege check is needed - mentions are direct notifications to specific users
        credentialCriteria = this.getUserSelfCriteria(userID);
        break;
      }
      case NotificationEvent.USER_SPACE_COMMUNITY_JOINED:
      case NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM:
      case NotificationEvent.USER_SPACE_COMMUNITY_INVITATION: {
        // For direct user invitations, no privilege check is needed - just check if the user exists and has notifications enabled
        credentialCriteria = this.getUserSelfCriteria(userID);
        break;
      }
      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION: {
        privilegeRequired = AuthorizationPrivilege.RECEIVE_NOTIFICATIONS;
        credentialCriteria =
          await this.getVirtualContributorCriteria(virtualContributorID);
        break;
      }
      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION_DECLINED: {
        // Notify the user who sent the invitation (triggeredBy)
        credentialCriteria = this.getUserSelfCriteria(userID);
        break;
      }
      default: {
        throw new NotificationEventException(
          `Unrecognized event encountered for privilege check: ${eventType}`,
          LogContext.NOTIFICATIONS
        );
      }
    }
    return { privilegeRequired, credentialCriteria };
  }

  private async getAuthorizationPolicy(
    eventType: NotificationEvent,
    entityID?: string,
    userID?: string,
    organizationID?: string,
    virtualContributorID?: string
  ): Promise<IAuthorizationPolicy> {
    switch (eventType) {
      case NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED:
      case NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED:
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED:
      case NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED: {
        // get the platform authorization policy
        return await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      }
      case NotificationEvent.ORGANIZATION_ADMIN_MESSAGE:
      case NotificationEvent.ORGANIZATION_ADMIN_MENTIONED: {
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
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION:
      case NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER:
      case NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION:
      case NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT:
      case NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE:
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

      case NotificationEvent.USER_SIGN_UP_WELCOME:
      case NotificationEvent.USER_MESSAGE:
      case NotificationEvent.USER_MESSAGE_SENDER:
      case NotificationEvent.ORGANIZATION_MESSAGE_SENDER:
      case NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT:
      case NotificationEvent.USER_COMMENT_REPLY:
      case NotificationEvent.USER_SPACE_COMMUNITY_JOINED:
      case NotificationEvent.USER_SPACE_COMMUNITY_INVITATION:
      case NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED:
      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION_DECLINED: {
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

      case NotificationEvent.VIRTUAL_CONTRIBUTOR_ADMIN_SPACE_COMMUNITY_INVITATION: {
        // get the Virtual Contributor authorization policy
        if (!virtualContributorID) {
          throw new ValidationException(
            'Virtual Contributor ID is required for space community invitation notifications',
            LogContext.NOTIFICATIONS
          );
        }
        const virtualContributor =
          await this.virtualContributorLookupService.getVirtualContributorOrFail(
            virtualContributorID
          );
        if (!virtualContributor.authorization) {
          throw new RelationshipNotFoundException(
            `Virtual Contributor does not have an authorization policy: ${virtualContributor.id}`,
            LogContext.NOTIFICATIONS
          );
        }

        return virtualContributor.authorization;
      }

      default:
        // For other events, no specific authorization policy is needed
        // or the event does not require a specific policy
        throw new NotificationEventException(
          `Unrecognized event when retrieving authorization policy for recipients: ${eventType}`,
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

  private getSpaceAdminCredentialCriteria(
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
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: spaceID,
      },
    ];
  }

  private getSpaceLeadCredentialCriteria(
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
        type: AuthorizationCredential.SPACE_LEAD,
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

  private async getVirtualContributorCriteria(
    virtualContributorID: string | undefined
  ): Promise<CredentialsSearchInput[]> {
    if (!virtualContributorID) {
      throw new ValidationException(
        'Virtual Contributor ID is required for notification recipients',
        LogContext.NOTIFICATIONS
      );
    }
    const virtual =
      await this.virtualContributorLookupService.getVirtualContributorOrFail(
        virtualContributorID,
        {
          relations: {
            account: true,
          },
        }
      );
    if (!virtual.account)
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtual.id} `,
        LogContext.NOTIFICATIONS
      );

    return [
      {
        type: AuthorizationCredential.ACCOUNT_ADMIN,
        resourceID: virtual.account.id,
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
      {
        type: AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        resourceID: '',
      },
    ];
  }
}
