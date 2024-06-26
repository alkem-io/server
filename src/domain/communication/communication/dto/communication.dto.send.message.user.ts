import { LONG_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

import { MaxLength } from 'class-validator';

@InputType()
export class CommunicationSendMessageToUserInput {
  @Field(() => [UUID], {
    nullable: false,
    description: 'All Users the message is being sent to',
  })
  receiverIds!: string[];

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  message!: string;
}
