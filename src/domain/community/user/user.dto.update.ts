import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateNameableInput } from '@domain/common/nameable-entity';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class UpdateUserInput extends UpdateNameableInput {
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

  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  profileData?: UpdateProfileInput;
}
