import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
@InputType()
export class UpdateOrganizationInput extends UpdateContributorInput {
  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Organization to update.',
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
