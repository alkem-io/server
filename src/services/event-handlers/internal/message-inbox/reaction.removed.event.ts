/**
 * Internal domain event published when a reaction is removed via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventService (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class ReactionRemovedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      messageId: string;
      reactionId: string;
      timestamp: number;
    }
  ) {}
}
