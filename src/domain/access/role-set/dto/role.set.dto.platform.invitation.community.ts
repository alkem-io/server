import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';

@InputType()
export class InviteNewContributorForRoleOnRoleSetInput extends CreatePlatformInvitationInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;
}
