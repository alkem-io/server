import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH, LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { UpdateTagsetInput } from '@domain/common/tagset';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity';
@InputType()
export class UpdateProfileInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [UpdateReferenceInput], { nullable: true })
  @IsOptional()
  references?: UpdateReferenceInput[];

  @Field(() => [UpdateTagsetInput], { nullable: true })
  @IsOptional()
  tagsets?: UpdateTagsetInput[];
}
