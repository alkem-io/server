import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateSpaceAboutInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  vision?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  who?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  impact?: string;
}
