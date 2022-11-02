import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateTagsetInput } from '@domain/common/tagset';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateLocationInput } from '@domain/common/location/dto';
import { Type } from 'class-transformer';

@InputType()
export class CreateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => CreateLocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLocationInput)
  location?: CreateLocationInput;

  @Field(() => [CreateTagsetInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTagsetInput)
  tagsetsData?: CreateTagsetInput[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceInput)
  referencesData?: CreateReferenceInput[];

  avatarURL?: string;
}
