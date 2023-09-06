import { CANVAS_VALUE_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class UpdateCalloutWhiteboardTemplateInput {
  // Todo: validate that it is actually JSON?
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  content?: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
