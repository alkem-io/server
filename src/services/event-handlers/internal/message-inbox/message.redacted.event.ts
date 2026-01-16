/**
 * Internal domain event published when a message is redacted (deleted) via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class MessageRedactedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      redactorActorId: string;
      redactedMessageId: string;
      redactionMessageId: string;
      reason?: string;
      threadId?: string;
      timestamp: number;
    }
  ) {}
}
