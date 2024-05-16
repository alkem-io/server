import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IsOptional, MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';

@InputType()
export class CreateInvitationForUsersOnCommunityInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  communityID!: string;

  @Field(() => [UUID], {
    nullable: false,
    description: 'The identifiers for the users being invited.',
  })
  invitedUsers!: string[];

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  invitedToParent!: boolean;
}
