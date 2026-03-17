/**
 * Internal domain event published when a room's properties are updated via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomUpdatedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      displayName?: string;
      avatarUrl?: string;
      topic?: string;
      timestamp: number;
    }
  ) {}
}
