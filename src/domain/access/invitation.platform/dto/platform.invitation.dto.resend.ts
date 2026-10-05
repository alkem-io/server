import { UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ResendPlatformInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The open platform invitation whose email is sent again.',
  })
  @MaxLength(UUID_LENGTH)
  ID!: string;
}
