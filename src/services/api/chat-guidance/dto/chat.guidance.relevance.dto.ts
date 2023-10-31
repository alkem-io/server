import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class ChatGuidanceAnswerRelevanceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The answer id.',
  })
  id!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the answer relevant or not.',
  })
  relevant!: boolean;
}
