import { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained constants — the migration must not import from
// src/services/ai-server/ai-persona/dto/external.config so future enum edits
// cannot rewrite history.
//
// The OpenAIModel enum was curated to chat-completion-capable models only and
// the GPT-4 / GPT-3.5 / O1 generations were retired in favour of the GPT-5.x
// family + remaining o-series reasoning models. ai_persona.externalConfig is a
// simple-json text column; any row whose `model` field holds one of the
// removed IDs would fail GraphQL serialization on read. Remap them all to the
// new default `gpt-5.4-nano`.
const REMOVED_MODELS = [
  'whisper-1',
  'tts-1',
  'tts-1-hd',
  'dall-e-2',
  'dall-e-3',
  'babbage-002',
  'davinci-002',
  'text-embedding-3-small',
  'text-embedding-3-large',
  'text-embedding-ada-002',
  'omni-moderation-latest',
  'text-moderation-latest',
  'gpt-4.5-preview',
  'gpt-4o-audio-preview',
  'gpt-4o-mini-audio-preview',
  'gpt-4o-realtime-preview',
  'gpt-4o-mini-realtime-preview',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'o1',
  'o1-mini',
  'gpt-3.5-turbo',
];

const FALLBACK_MODEL = 'gpt-5.4-nano';

export class RemapDeprecatedOpenAIModels1778889600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE ai_persona
       SET "externalConfig" = jsonb_set(
         "externalConfig"::jsonb,
         '{model}',
         to_jsonb($1::text)
       )::text
       WHERE "externalConfig" IS NOT NULL
         AND "externalConfig" <> ''
         AND ("externalConfig"::jsonb) ? 'model'
         AND ("externalConfig"::jsonb)->>'model' = ANY($2::text[])`,
      [FALLBACK_MODEL, REMOVED_MODELS]
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: original model values are not retained. Reversing this migration
    // would re-introduce IDs that no longer exist in the OpenAIModel enum and
    // would break GraphQL serialization. Rolling back the enum change itself
    // is the only meaningful undo.
  }
}
