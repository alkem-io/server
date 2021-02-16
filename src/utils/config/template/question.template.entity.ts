import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuestionTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Question.',
  })
  question!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is question required.',
  })
  required!: boolean;
}
