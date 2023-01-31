import { MID_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

import { MaxLength } from 'class-validator';

@InputType()
export class CommunicationSendMessageToCommunityLeadsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Community the message is being sent to',
  })
  communityId!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
