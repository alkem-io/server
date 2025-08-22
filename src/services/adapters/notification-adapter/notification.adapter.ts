import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { NotificationInputBase } from './dto/notification.dto.input.base';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { NotificationInputEntityMentions } from './dto/user/notification.dto.input.entity.mentions';
import { MentionedEntityType } from '@domain/communication/messaging/mention.interface';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { NotificationInputUserMention } from './dto/user/notification.dto.input.user.mention';
import { NotificationUserAdapter } from './notification.user.adapter';
import { NotificationOrganizationAdapter } from './notification.organization.adapter';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationsRecipientsService: NotificationRecipientsService,
    private notificationUserAdapter: NotificationUserAdapter,
    private notificationOrganizationAdapter: NotificationOrganizationAdapter
  ) {}

  public async entityMentions(
    eventData: NotificationInputEntityMentions
  ): Promise<void> {
    for (const mention of eventData.mentions) {
      const entityMentionNotificationInput: NotificationInputUserMention = {
        triggeredBy: eventData.triggeredBy,
        comment: eventData.comment,
        mentionedEntityID: mention.id,
        commentsId: eventData.roomId,
        originEntity: eventData.originEntity,
        commentType: eventData.commentType,
      };

      if (mention.type == MentionedEntityType.USER) {
        this.notificationUserAdapter.userMention(
          entityMentionNotificationInput
        );
      }
      if (mention.type == MentionedEntityType.ORGANIZATION) {
        this.notificationOrganizationAdapter.organizationMention(
          entityMentionNotificationInput
        );
      }
    }
  }

  public async getNotificationRecipients(
    event: NotificationEvent,
    eventData: NotificationInputBase,
    spaceID?: string,
    userID?: string,
    organizationID?: string,
    virtualContributorID?: string
  ): Promise<NotificationRecipientResult> {
    this.logEventTriggered(eventData, event);

    const recipients = await this.notificationsRecipientsService.getRecipients({
      eventType: event,
      spaceID,
      userID,
      organizationID,
      virtualContributorID,
    });
    return recipients;
  }

  private logEventTriggered(
    eventData: NotificationInputBase,
    eventType: NotificationEvent
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorizationMetaInfo(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.NOTIFICATIONS
    );
  }
}
