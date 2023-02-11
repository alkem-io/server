import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('FormQuestion')
export abstract class IFormQuestion {
  @Field(() => String, {
    nullable: false,
    description: 'The question to be answered',
  })
  question!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The explation text to clarify the question.',
  })
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
