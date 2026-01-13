/**
 * Internal domain event published when a DM (direct message) is requested via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class RoomDmRequestedEvent {
  constructor(
    public readonly payload: {
      initiatorActorId: string;
      targetActorId: string;
    }
  ) {}
}
