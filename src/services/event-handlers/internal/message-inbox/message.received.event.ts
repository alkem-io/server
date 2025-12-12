import { MessageReceivedPayload } from '@alkemio/matrix-adapter-lib';

/**
 * Internal domain event published when a message is received from Matrix Adapter.
 *
 * This event is published by the CommunicationAdapterEventController (boundary)
 * and consumed by MessageInboxService (domain orchestration).
 */
export class MessageReceivedEvent {
  constructor(public readonly payload: MessageReceivedPayload) {}
}
