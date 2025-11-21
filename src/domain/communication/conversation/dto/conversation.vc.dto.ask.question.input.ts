import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

export type LanguageType =
  | 'EN'
  | 'US'
  | 'UK'
  | 'FR'
  | 'DE'
  | 'ES'
  | 'NL'
  | 'BG'
  | 'UA';

@InputType()
export class ConversationVcAskQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the conversation.',
  })
  conversationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The language of the answer.',
  })
  language?: LanguageType;
}
