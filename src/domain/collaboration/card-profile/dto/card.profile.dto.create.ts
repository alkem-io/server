import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateReferenceInput } from '@domain/common/reference';
import { Type } from 'class-transformer';
import { CreateLocationInput } from '@domain/common/location/dto/location.dto.create';

@InputType()
export class CreateCardProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceInput)
  referencesData?: CreateReferenceInput[];

  @Field(() => CreateLocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLocationInput)
  location?: CreateLocationInput;
}
