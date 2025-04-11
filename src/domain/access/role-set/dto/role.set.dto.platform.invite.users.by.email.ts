import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { RoleName } from '@common/enums/role.name';

@InputType()
export class InviteUsersByEmailForRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field({
    nullable: false,
  })
  @IsEmail({}, { each: true })
  @MaxLength(MID_TEXT_LENGTH, { each: true })
  emails!: string[];

  @Field(() => RoleName, {
    nullable: true,
    description:
      'An additional role to assign to the Contributors, in addition to the entry Role.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  roleSetExtraRole?: RoleName;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  roleSetInvitedToParent!: boolean;
}
