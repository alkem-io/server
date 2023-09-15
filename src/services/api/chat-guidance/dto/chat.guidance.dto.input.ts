import { Field, InputType } from '@nestjs/graphql';
import { languageType } from '@services/adapters/chat-guidance-adapter/dto/guidance.engine.dto.query';

@InputType()
export class ChatGuidanceInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The language of the answer.',
  })
  language?: languageType;
}
