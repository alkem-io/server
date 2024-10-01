import { MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the contributor being invited.',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  invitedContributor!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  roleSetID!: string;
  invitedToParent!: boolean;
}
