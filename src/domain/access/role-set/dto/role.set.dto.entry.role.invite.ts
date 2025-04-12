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
export class InviteForEntryRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field(() => [String], {
    nullable: false,
  })
  @IsEmail({}, { each: true })
  @MaxLength(MID_TEXT_LENGTH, { each: true })
  emails!: string[];

  @Field(() => [UUID], {
    nullable: false,
    description: 'The identifiers for the contributors being invited.',
  })
  invitedContributors!: string[];

  @Field({ nullable: true, description: 'The welcome message to send' })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  welcomeMessage?: string;

  @Field(() => RoleName, {
    nullable: true,
    description:
      'An additional role to assign to the Contributors, in addition to the entry Role.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  extraRole?: RoleName;

  @Field(() => [UUID], {
    nullable: false,
    description: 'The identifiers for the contributors being invited.',
  })
  invitedContributorIDs!: string[];
}
