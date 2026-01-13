/**
 * Internal domain event published when a member leaves a room via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomMemberLeftEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      actorId: string;
      reason?: string;
      timestamp: number;
    }
  ) {}
}
