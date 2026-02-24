/**
 * Internal domain event published when a read receipt is updated via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomReceiptUpdatedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      actorID: string;
      eventId: string;
      threadId?: string;
      timestamp: number;
    }
  ) {}
}
