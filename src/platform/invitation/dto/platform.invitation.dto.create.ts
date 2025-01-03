import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { RoleType } from '@common/enums/role.type';
import { PlatformRole } from '@common/enums/platform.role';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreatePlatformInvitationInput {
  @Field({
    nullable: false,
  })
  @IsEmail()
  @MaxLength(MID_TEXT_LENGTH)
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  roleSetID?: string;
  roleSetInvitedToParent!: boolean;
  roleSetExtraRole?: RoleType;

  platformRole?: PlatformRole;
}
