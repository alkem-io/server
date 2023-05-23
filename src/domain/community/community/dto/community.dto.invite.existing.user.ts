import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';
import { CreateInvitationInput } from '@domain/community/invitation';

@InputType()
export class CreateInvitationExistingUserOnCommunityInput extends CreateInvitationInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  communityID!: string;
}
