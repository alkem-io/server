import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { UpdateTagsetInput } from '@domain/common/tagset/tagset.dto.update';
import { UpdateLocationInput } from '@domain/common/location/dto/location.dto.update';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true, description: 'The display name for the entity.' })
  @IsOptional()
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field({
    nullable: true,
    description: 'A memorable short description for this entity.',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  tagline?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [UpdateReferenceInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateReferenceInput)
  references?: UpdateReferenceInput[];

  @Field(() => [UpdateTagsetInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTagsetInput)
  tagsets?: UpdateTagsetInput[];

  @Field(() => UpdateLocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationInput)
  location?: UpdateLocationInput;
}
