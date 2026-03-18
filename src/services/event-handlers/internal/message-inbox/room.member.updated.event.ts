/**
 * Internal domain event published when a room member is updated via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomMemberUpdatedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      memberActorID: string;
      senderActorID: string;
      membership: string;
      timestamp: number;
    }
  ) {}
}
