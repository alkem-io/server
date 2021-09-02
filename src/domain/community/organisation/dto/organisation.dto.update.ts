import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { UUID_NAMEID } from '@domain/common/scalars';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common';
@InputType()
export class UpdateOrganisationInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;

  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Organisation to update.',
  })
  ID!: string;

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
