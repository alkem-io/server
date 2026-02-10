import { LogContext } from '@common/enums/logging.context';
import { NotificationEvent } from '@common/enums/notification.event';
import { stringifyWithoutAuthorizationMetaInfo } from '@common/utils';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotificationRecipientResult } from '@services/api/notification-recipients/dto/notification.recipients.dto.result';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationInputBase } from './dto/notification.dto.input.base';

@Injectable()
export class NotificationAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private notificationsRecipientsService: NotificationRecipientsService
  ) {}

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
      triggeredBy: eventData.triggeredBy,
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
