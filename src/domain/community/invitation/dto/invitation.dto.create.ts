import { UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

export class CreateInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the user being invited.',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  invitedUser!: string;

  invitedBy!: string;

  communityID!: string;
}
