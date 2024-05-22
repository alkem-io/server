import { MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the user being invited.',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  invitedUser!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  communityID!: string;
  invitedToParent!: boolean;
}
