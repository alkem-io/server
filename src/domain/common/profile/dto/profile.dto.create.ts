import { InputType, Field, ObjectType } from '@nestjs/graphql';
import {
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HUGE_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateLocationInput } from '@domain/common/location/dto';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CreateVisualOnProfileInput } from './profile.dto.create.visual';

@InputType()
@ObjectType('CreateProfileData')
export class CreateProfileInput {
  @Field({
    nullable: false,
    description: 'The display name for the entity.',
  })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field({
    nullable: true,
    description: 'A memorable short description for this entity.',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  tagline?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(HUGE_TEXT_LENGTH)
  description?: string;

  @Field(() => CreateLocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLocationInput)
  location?: CreateLocationInput;

  @Field(() => [CreateReferenceInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceInput)
  referencesData?: CreateReferenceInput[];

  @Field(() => [CreateTagsetInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTagsetInput)
  tagsets?: CreateTagsetInput[];

  @Field(() => [CreateVisualOnProfileInput], {
    nullable: true,
    description: 'The visuals URLs',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateVisualOnProfileInput)
  visuals?: CreateVisualOnProfileInput[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
