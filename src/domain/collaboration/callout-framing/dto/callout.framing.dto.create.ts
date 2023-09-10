import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CANVAS_VALUE_LENGTH } from '@common/constants';
import JSON from 'graphql-type-json';
@InputType()
export class CreateCalloutFramingInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  content?: string;
}
