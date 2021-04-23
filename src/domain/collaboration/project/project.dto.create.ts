import { TextID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field({ nullable: false })
  parentID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TextID, { nullable: false })
  @IsUniqueTextId(TextIdType.project)
  textID!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;
}
