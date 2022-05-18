import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateTagsetInput } from '@domain/common/tagset';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateLocationInput } from '@domain/common/location/dto';

@InputType()
export class CreateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  location?: CreateLocationInput;

  @Field(() => [CreateTagsetInput], { nullable: true })
  tagsetsData?: CreateTagsetInput[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  referencesData?: CreateReferenceInput[];
}
