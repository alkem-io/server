import { Field, InputType } from '@nestjs/graphql';

@InputType('ExternalConfig')
export class IExternalConfig {
  @Field(() => String, {
    nullable: true,
    description: 'The API key for the external LLM provider.',
  })
  apiKey?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The assistent ID backing the service in OpenAI`s assistant API',
  })
  assistantId?: string;
}
