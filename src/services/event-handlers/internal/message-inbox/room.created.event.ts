/**
 * Internal domain event published when a room is created via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomCreatedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      creatorActorId: string;
      roomType: string;
      name?: string;
      topic?: string;
      timestamp: number;
    }
  ) {}
}
