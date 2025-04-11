import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

enum OpenAIModel {
  O3_MINI = 'o3-mini',
  O1 = 'o1',
  O1_MINI = 'o1-mini',
  GPT_4_5_PREVIEW = 'gpt-4.5-preview',
  GPT_4O = 'gpt-4o',
  GPT_4O_AUDIO_PREVIEW = 'gpt-4o-audio-preview',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O_MINI_AUDIO_PREVIEW = 'gpt-4o-mini-audio-preview',
  GPT_4O_REALTIME_PREVIEW = 'gpt-4o-realtime-preview',
  GPT_4O_MINI_REALTIME_PREVIEW = 'gpt-4o-mini-realtime-preview',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  DALL_E_3 = 'dall-e-3',
  DALL_E_2 = 'dall-e-2',
  TTS_1 = 'tts-1',
  TTS_1_HD = 'tts-1-hd',
  WHISPER_1 = 'whisper-1',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  OMNI_MODERATION_LATEST = 'omni-moderation-latest',
  TEXT_MODERATION_LATEST = 'text-moderation-latest',
  BABBAGE_002 = 'babbage-002',
  DAVINCI_002 = 'davinci-002',
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
  model?: string = OpenAIModel.O1;
}
