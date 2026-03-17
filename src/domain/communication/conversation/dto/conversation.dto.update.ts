import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, Matches, MaxLength, ValidateIf } from 'class-validator';

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
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Avatar URL for the conversation. Accepts mxc:// or https:// URLs. Pass empty string to remove.',
  })
  @IsOptional()
  @ValidateIf(o => o.avatarUrl !== '')
  @Matches(/^(mxc:\/\/|https:\/\/).+$/, {
    message:
      'avatarUrl must be an mxc:// or https:// URL, or empty string to remove',
  })
  avatarUrl?: string;
}
