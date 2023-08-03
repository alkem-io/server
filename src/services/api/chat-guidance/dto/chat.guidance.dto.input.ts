import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ChatGuidanceInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;
}
