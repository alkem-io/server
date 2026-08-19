import { registerEnumType } from '@nestjs/graphql';

export enum DirectMessageDeliveryStatus {
  SENT = 'SENT',
  BLOCKED_NO_CONSENT = 'BLOCKED_NO_CONSENT',
  FAILED = 'FAILED',
}

registerEnumType(DirectMessageDeliveryStatus, {
  name: 'DirectMessageDeliveryStatus',
  description:
    'Per-recipient outcome of sendDirectMessageToUsers. SENT: delivered (a conversation id is returned). BLOCKED_NO_CONSENT: the recipient disabled direct messages. FAILED: an unexpected per-recipient error (other recipients are still processed).',
});
