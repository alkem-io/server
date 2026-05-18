import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

enum OpenAIModel {
  GPT_5_5 = 'gpt-5.5',
  GPT_5_5_PRO = 'gpt-5.5-pro',
  GPT_5_4 = 'gpt-5.4',
  GPT_5_4_MINI = 'gpt-5.4-mini',
  GPT_5_4_NANO = 'gpt-5.4-nano',
  GPT_5_4_PRO = 'gpt-5.4-pro',
  GPT_5_2 = 'gpt-5.2',
  GPT_5_2_PRO = 'gpt-5.2-pro',
  GPT_5_1 = 'gpt-5.1',
  GPT_5_1_MINI = 'gpt-5.1-mini',
  GPT_5 = 'gpt-5',
  GPT_5_MINI = 'gpt-5-mini',
  GPT_5_NANO = 'gpt-5-nano',
  GPT_5_PRO = 'gpt-5-pro',
  O4_MINI = 'o4-mini',
  O3_PRO = 'o3-pro',
  O3 = 'o3',
  O3_MINI = 'o3-mini',
}

registerEnumType(OpenAIModel, {
  name: 'OpenAIModel',
});

@ObjectType('ExternalConfig')
@InputType('ExternalConfigInput')
export class IExternalConfig {
  @Field(() => String, {
    nullable: true,
    description: 'The API key for the external LLM provider.',
  })
  apiKey?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The assistant ID backing the service in OpenAI`s assistant API',
  })
  assistantId?: string;
  @Field(() => OpenAIModel, {
    nullable: false,
    description: 'The OpenAI model to use for the service',
  })
  model?: string = OpenAIModel.GPT_5_4_NANO;
}
