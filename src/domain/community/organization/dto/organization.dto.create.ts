import { Field, InputType } from '@nestjs/graphql';
import { CreateProfileInput } from '@domain/community/profile';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common';

@InputType()
export class CreateOrganizationInput extends CreateNameableInput {
  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  legalEntityName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  domain?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  website?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(SMALL_TEXT_LENGTH)
  contactEmail?: string;
}
