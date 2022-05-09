import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';

@InputType()
export class CreateOrganizationInput extends CreateContributorInput {
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
