import { MID_TEXT_LENGTH } from '@common/constants';
import { RoleName } from '@common/enums/role.name';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreatePlatformInvitationsInput {
  @Field({
    nullable: false,
  })
  @IsEmail({}, { each: true })
  @MaxLength(MID_TEXT_LENGTH, { each: true })
  emails!: string[];

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  createdBy!: string;

  roleSetID?: string;
  roleSetInvitedToParent!: boolean;
  roleSetExtraRole?: RoleName;
}
