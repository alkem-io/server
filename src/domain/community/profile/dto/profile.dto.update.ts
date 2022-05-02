import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { UpdateTagsetInput } from '@domain/common/tagset';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateLocationInput } from '@domain/common/location/dto/location.dto.update';
@InputType()
export class UpdateProfileInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [UpdateReferenceInput], { nullable: true })
  references?: UpdateReferenceInput[];

  @Field(() => [UpdateTagsetInput], { nullable: true })
  tagsets?: UpdateTagsetInput[];

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  location?: UpdateLocationInput;
}
