import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { RoleType } from '@common/enums/role.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateInvitationInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the contributor being invited to join in the entry Role.',
  })
  @MaxLength(UUID_LENGTH)
  invitedContributorID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  roleSetID!: string;
  invitedToParent!: boolean;

  @Field(() => RoleType, {
    nullable: true,
    description:
      'An additional role to assign to the Contributor, in addition to the entry Role.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  extraRole?: RoleType;
}
