import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum DirectConversationResolutionStatus {
  CREATED = 'CREATED',
  RESOLVED = 'RESOLVED',
  BLOCKED_NO_CONSENT = 'BLOCKED_NO_CONSENT',
  FAILED = 'FAILED',
}

registerEnumType(DirectConversationResolutionStatus, {
  name: 'DirectConversationResolutionStatus',
  description:
    'Per-recipient outcome of resolving a direct conversation: newly CREATED, an existing one RESOLVED, BLOCKED_NO_CONSENT when the recipient is not a user that accepts messages (including ids that match no user), FAILED when resolving the recipient raised an error.',
});

@ObjectType('DirectConversationResolutionResult', {
  description:
    'The direct conversation with one recipient, resolved or created without sending any message. A provisioning failure of the room yields CREATED with the conversation room readiness FAILED — the conversation exists and is repairable.',
})
export class DirectConversationResolutionResult {
  @Field(() => UUID, {
    nullable: false,
    description: 'The recipient this result is about.',
  })
  memberID!: string;

  @Field(() => DirectConversationResolutionStatus, { nullable: false })
  status!: DirectConversationResolutionStatus;

  @Field(() => IConversation, {
    nullable: true,
    description:
      'The direct conversation with the recipient; null for BLOCKED_NO_CONSENT and FAILED.',
  })
  conversation?: IConversation;
}
