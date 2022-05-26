import { InputType, Field } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateTemplateBaseInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  title?: string;
}
