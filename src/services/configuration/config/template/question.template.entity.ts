import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuestionTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Question template.',
  })
  question!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is question required?',
  })
  required!: boolean;
}
