import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import {
  LONGER_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { RoleName } from '@common/enums/role.name';

@InputType()
export class InviteForEntryRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field(() => [UUID], {
    nullable: false,
    description: 'The actor identifiers for those being invited.',
  })
  invitedActorIds!: string[];

  @Field(() => [String], {
    nullable: false,
  })
  @IsEmail({}, { each: true })
  @MaxLength(MID_TEXT_LENGTH, { each: true })
  invitedUserEmails!: string[];

  @Field({ nullable: true, description: 'The welcome message to send' })
  @IsOptional()
  @MaxLength(LONGER_TEXT_LENGTH)
  welcomeMessage?: string;

  @Field(() => [RoleName], {
    nullable: false,
    description: 'Additional roles to assign in addition to the entry Role.',
  })
  extraRoles!: RoleName[];
}
