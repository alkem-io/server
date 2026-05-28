import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

@InputType()
export class EmailChangeApproverInput {
  @Field(() => String, {
    nullable: false,
    description: 'Name of the person who authorized the change.',
  })
  @IsNotEmpty()
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => String, {
    nullable: false,
    description:
      "The approver's role or title within the organization (e.g. 'Organization Administrator').",
  })
  @IsNotEmpty()
  @MaxLength(SMALL_TEXT_LENGTH)
  role!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The organization within which the change was authorized, if applicable.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  organization?: string;
}

@InputType()
export class AdminUserEmailChangeInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The subject user whose login email is being changed.',
  })
  @IsUUID()
  userID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The proposed new email address.',
  })
  @IsEmail()
  newEmail!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Admin justification for the change (e.g. support-ticket reference). Recorded on every audit entry for this operation.',
  })
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  reason!: string;

  @Field(() => EmailChangeApproverInput, {
    nullable: false,
    description:
      "Who authorized the change within the subject user's organization. Distinct from the acting platform admin.",
  })
  @ValidateNested()
  @Type(() => EmailChangeApproverInput)
  approver!: EmailChangeApproverInput;
}
