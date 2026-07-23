import {
  LONGER_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { SUPPORTED_INTERFACE_LANGUAGES } from '@common/constants/supported.languages';
import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class InviteForEntryRoleOnRoleSetInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  roleSetID!: string;

  @Field(() => [UUID], {
    nullable: false,
    description: 'The identifiers for the actors being invited.',
  })
  invitedActorIDs!: string[];

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

  @Field(() => String, {
    nullable: true,
    description:
      'Optional language the inviter expects the invitees to prefer (single value for the whole batch — FR-014a; must be in the eligible set at compose time — DL-8). Recorded per-invitation so per-invitee granularity later is a UI change, not a migration (FR-014b).',
  })
  @IsOptional()
  @IsIn([...SUPPORTED_INTERFACE_LANGUAGES])
  suggestedLanguage?: string;
}
