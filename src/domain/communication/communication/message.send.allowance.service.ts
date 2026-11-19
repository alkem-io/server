import { MessageSendLimitReachedException } from '@common/exceptions/message.send.limit.reached.exception';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

const MESSAGE_SEND_LIMIT = 20;
const MESSAGE_SEND_WINDOW_MINUTES = 60;

export type MessageSendAction =
  | 'sendMessageToUsers'
  | 'sendDirectMessageToUsers'
  | 'sendMessageToOrganization'
  | 'sendMessageToCommunityLeads';

// One atomic statement: drops the sender's times older than the window, and
// appends `count` new times only if the total stays within the limit. Both the
// new times and the cut-off come from the database's clock. A refused claim
// writes nothing and returns no row.
const CLAIM_STATEMENT = `
INSERT INTO message_send_allowance ("actorId", "sentAt")
SELECT $1::uuid, array_fill(now(), ARRAY[$2::int])
WHERE $2::int <= ${MESSAGE_SEND_LIMIT}
ON CONFLICT ("actorId") DO UPDATE
SET "sentAt" = ARRAY(
      SELECT t FROM unnest(message_send_allowance."sentAt") AS t
      WHERE t > now() - interval '${MESSAGE_SEND_WINDOW_MINUTES} minutes'
    ) || EXCLUDED."sentAt"
WHERE (
      SELECT count(*) FROM unnest(message_send_allowance."sentAt") AS t
      WHERE t > now() - interval '${MESSAGE_SEND_WINDOW_MINUTES} minutes'
    ) + $2::int <= ${MESSAGE_SEND_LIMIT}
RETURNING 1`;

@Injectable()
export class MessageSendAllowanceService {
  constructor(private readonly entityManager: EntityManager) {}

  /**
   * Takes `count` messages from the sender's allowance of 20 per rolling
   * 60 minutes, or refuses the whole send and takes nothing.
   */
  async claim(
    actorID: string,
    count: number,
    action: MessageSendAction
  ): Promise<void> {
    if (count <= 0) return;

    const rows: unknown[] = await this.entityManager.query(CLAIM_STATEMENT, [
      actorID,
      count,
    ]);
    if (rows.length !== 1) {
      throw new MessageSendLimitReachedException({ userId: actorID, action });
    }
  }
}
