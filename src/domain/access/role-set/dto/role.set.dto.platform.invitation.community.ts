import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { RoleName } from '@common/enums/role.name';

@InputType()
export class InviteNewContributorForRoleOnRoleSetInput extends CreatePlatformInvitationInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field(() => RoleName, {
    nullable: true,
    description:
      'An additional role to assign to the Contributors, in addition to the entry Role.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  roleSetExtraRole?: RoleName;
}
