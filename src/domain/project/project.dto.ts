import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@constants';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsUniqueTextId,
  TextIdType,
} from '@utils/validation/constraints/unique.text.id';
import { MaxLength } from 'class-validator';
import { TINY_TEXT_LENGTH } from '@constants';

@InputType()
export class ProjectInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
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
