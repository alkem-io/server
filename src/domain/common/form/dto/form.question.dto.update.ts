import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class UpdateFormQuestionInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question to be answered',
  })
  @MaxLength(MID_TEXT_LENGTH)
  question!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The explation text to clarify the question.',
  })
  @MaxLength(MID_TEXT_LENGTH)
  explanation!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The sort order of this question in a wider set of questions.',
  })
  sortOrder!: number;

  @Field(() => Number, {
    nullable: false,
    description:
      'The maxiumum length of the answer, in characters, up to a limit of 512.',
  })
  maxLength!: number;
}
