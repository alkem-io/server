import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateConversationInput {
  @Field(() => UUID, {
    description: 'The ID of the conversation to update.',
  })
  conversationID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'New display name for the conversation. Only GROUP conversations support custom names.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Avatar URL for the conversation. Accepts mxc:// or https:// URLs. Pass empty string to remove.',
  })
  avatarUrl?: string;
}
