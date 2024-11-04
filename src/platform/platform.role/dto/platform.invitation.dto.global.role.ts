import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { PlatformRole } from '@common/enums/platform.role';

@InputType()
export class CreatePlatformInvitationForRoleInput extends CreatePlatformInvitationInput {
  @Field(() => PlatformRole, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  platformRole!: PlatformRole;
}
