import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';
import { Field, InputType } from '@nestjs/graphql';
import { VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class CreateSpaceAboutInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profileData!: CreateProfileInput;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  why?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  who?: string;

  @Field(() => CreateCommunityGuidelinesInput, {
    nullable: true,
    description: 'The CommunityGuidelines for the Space',
  })
  @IsOptional()
  guidelines?: CreateCommunityGuidelinesInput;
}
