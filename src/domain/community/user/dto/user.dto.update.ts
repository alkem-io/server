import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';

@InputType()
export class UpdateUserInput extends UpdateContributorInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  ID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  accountUpn?: string;

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
  @MaxLength(SMALL_TEXT_LENGTH)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  gender?: string;

  @Field({
    nullable: true,
    description:
      'Set this user profile as being used as a service account or not.',
  })
  serviceProfile?: boolean;
}
