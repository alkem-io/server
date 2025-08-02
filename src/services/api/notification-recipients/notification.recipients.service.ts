import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';
import { UserNotificationEvent } from '@common/enums/user.notification.event';
import { AuthorizationCredential } from '@common/enums';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';

export class NotificationRecipientsService {
  constructor(
    private userLookupService: UserLookupService,
    private spaceLookupService: SpaceLookupService,
    private organizationLookupService: OrganizationLookupService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getRecipients(
    eventData: NotificationRecipientsInput
  ): Promise<NotificationRecipientResult> {
    this.logger.log(
      `Getting notification recipients for: ${JSON.stringify(eventData)}`
    );

    // Logic steps:
    // 1. Depending on the event type, get a) the candidate list of recipients b) the privilege required per recipient c) whether inApp is enabled or not
    // 2. Filter the candidate list based on the privilege required
    const privilegeRequired: AuthorizationCredential | undefined = undefined;
    let inAppEnabled = false;
    let credentialCriteria: CredentialsSearchInput = {
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    };

    switch (eventData.eventType) {
      case UserNotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT: {
        {
          inAppEnabled = true;
          // All users can receive these notifications
          credentialCriteria = {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            // Here the entityID is the discussion creator ID
            resourceID: eventData.entityID || '',
          };
          break;
        }
      }
      case UserNotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED: {
        // All users can receive these notifications
        credentialCriteria = {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        };
        break;
      }

      // Handle forum discussion comment event
    }

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
      recipientsWithPrivilege = candidateRecipients.filter(recipient =>
        this.authorizationService.isAccessGrantedForCredentials(
          recipient.agent.credentials || [],
          [],
          recipient.authorization,
          privilegeRequired
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
}
