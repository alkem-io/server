import { BaseSubscriptionPayload } from '@common/interfaces';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { ConversationGovernanceEventType } from '@domain/communication/conversation/dto/conversation.governance.event';
import { RoomReadinessRecord } from '@domain/communication/room/dto/room.readiness';

export interface ConversationGovernanceEventData {
  eventType: ConversationGovernanceEventType;
  conversationID: string;
  conversation?: IConversation;
  member?: IActor;
  memberID?: string;
  readiness?: RoomReadinessRecord;
}

/**
 * Wire payload of the governance-only conversation channel. `memberActorIds`
 * is the delivery set captured at publish time (for a removal it includes
 * the removed member once; for a deletion it is captured before deletion).
 */
export interface ConversationGovernanceEventSubscriptionPayload
  extends BaseSubscriptionPayload {
  memberActorIds: string[];
  event: ConversationGovernanceEventData;
}
