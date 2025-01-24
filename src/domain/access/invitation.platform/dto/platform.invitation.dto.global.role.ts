import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { CreatePlatformInvitationInput } from '@domain/access/invitation.platform/dto/platform.invitation.dto.create';
import { RoleName } from '@common/enums/role.name';

@InputType()
export class CreatePlatformInvitationForRoleInput extends CreatePlatformInvitationInput {
  @Field(() => RoleName, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  platformRole!: RoleName;
}
