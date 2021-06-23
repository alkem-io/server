import { UpdateBaseCherrytwistInput } from '@domain/common/entity/base-entity';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  title?: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  framing?: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  explanation?: string;
}
