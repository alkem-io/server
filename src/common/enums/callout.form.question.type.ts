import { registerEnumType } from '@nestjs/graphql';

export enum CalloutFormQuestionType {
  SHORT_TEXT = 'short_text',
  LONG_TEXT = 'long_text',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
}

registerEnumType(CalloutFormQuestionType, {
  name: 'CalloutFormQuestionType',
  description: 'The answer type of a Form question.',
});
