import { InputType, Field } from '@nestjs/graphql';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  TINY_TEXT_LENGTH,
} from '@src/common/constants';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateProjectInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  ID!: string;

  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(TINY_TEXT_LENGTH)
  @IsUniqueTextId(TextIdType.project)
  textID!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  state!: string;
}
