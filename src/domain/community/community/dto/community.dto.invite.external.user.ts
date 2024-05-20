import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';
import { CreateInvitationExternalInput } from '@domain/community/invitation.external/dto/invitation.external.dto.create';

@InputType()
export class CreateInvitationUserByEmailOnCommunityInput extends CreateInvitationExternalInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  communityID!: string;
}
