import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';

export class NotificationRecipientsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getRecipients(
    notificationRecipientsData: NotificationRecipientsInput
  ): Promise<NotificationRecipientResult> {
    this.logger.log(
      `Getting notification recipients for: ${JSON.stringify(
        notificationRecipientsData
      )}`
    );

    // Implement your logic to retrieve notification recipients here
    return {
      emailRecipients: [],
      inAppRecipients: [],
    };
  }
}
