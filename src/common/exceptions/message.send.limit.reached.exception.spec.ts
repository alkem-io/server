import { AlkemioErrorStatus, ErrorCategory } from '@common/enums';
import { BaseException } from './base.exception';
import { getMetadataForStatus } from './error.status.metadata';
import { MessageSendLimitReachedException } from './message.send.limit.reached.exception';

describe('MessageSendLimitReachedException', () => {
  it('carries the dedicated code, its numeric code, message key and the two given details', () => {
    const error = new MessageSendLimitReachedException({
      userId: 'actor-1',
      action: 'sendMessageToUsers',
    });

    expect(error).toBeInstanceOf(BaseException);
    expect(error.extensions.code).toBe(
      AlkemioErrorStatus.MESSAGE_SEND_LIMIT_REACHED
    );
    expect(
      getMetadataForStatus(AlkemioErrorStatus.MESSAGE_SEND_LIMIT_REACHED)
        .category
    ).toBe(ErrorCategory.OPERATIONS);
    expect(error.extensions.numericCode).toBe(
      ErrorCategory.OPERATIONS * 1000 + 126
    );
    expect(error.extensions.userMessage).toBe(
      'userMessages.operations.messageSendLimitReached'
    );
    expect(error.extensions.details).toEqual({
      userId: 'actor-1',
      action: 'sendMessageToUsers',
    });
    expect(Object.keys(error.details ?? {}).sort()).toEqual([
      'action',
      'userId',
    ]);
  });
});
