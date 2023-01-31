import { MID_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

import { MaxLength } from 'class-validator';

@InputType()
export class CommunicationSendMessageToOrganizationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Organization the message is being sent to',
  })
  organizationId!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
