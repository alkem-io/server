import { DirectMessageDeliveryStatus } from '@common/enums/direct.message.delivery.status';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('DirectMessageDeliveryResult')
export class DirectMessageDeliveryResult {
  @Field(() => UUID, {
    nullable: false,
    description: 'The intended recipient.',
  })
  receiverID!: string;

  @Field(() => DirectMessageDeliveryStatus, {
    nullable: false,
    description: 'The per-recipient delivery outcome.',
  })
  status!: DirectMessageDeliveryStatus;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Set when status = SENT — the (existing or newly created) 1:1 conversation the message was delivered to.',
  })
  conversationID?: string;
}
