import { InputType, Field } from '@nestjs/graphql';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity';

@InputType()
export class UpdateReferenceInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  //@IsUrl()
  @MaxLength(MID_TEXT_LENGTH)
  uri?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
