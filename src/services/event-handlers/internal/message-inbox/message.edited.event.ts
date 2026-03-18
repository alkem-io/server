/**
 * Internal domain event published when a message is edited via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class MessageEditedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      senderActorID: string;
      originalMessageId: string;
      newMessageId: string;
      newContent: string;
      threadId?: string;
      timestamp: number;
    }
  ) {}
}
