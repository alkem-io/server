import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateLocationInput } from '@domain/common/location/dto';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
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
  @MaxLength(MID_TEXT_LENGTH)
  tagline?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
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

  @Field({
    nullable: true,
    description: 'The URL of the avatar of the user',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  avatarURL?: string;
}
