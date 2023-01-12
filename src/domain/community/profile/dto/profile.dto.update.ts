import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { UpdateTagsetInput } from '@domain/common/tagset/tagset.dto.update';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateLocationInput } from '@domain/common/location/dto/location.dto.update';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
@InputType()
export class UpdateProfileInput extends UpdateBaseAlkemioInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
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
