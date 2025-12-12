/**
 * Internal domain event published when a reaction is added via Matrix Adapter.
 *
 * Published by CommunicationAdapterEventController (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class ReactionAddedEvent {
  constructor(
    public readonly payload: {
      roomId: string;
      messageId: string;
      reactionId: string;
      emoji: string;
      actorID: string;
      timestamp: number;
    }
  ) {}
}
