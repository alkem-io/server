import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Language configuration surfaced to the client via the platform Config query.
 * Contract C2 (anonymous-readable — the platform query carries no auth guard).
 *
 * eligible: the subset of supported languages the platform proactively detects,
 *           offers, and accepts as an invitation suggestion. An empty list disables
 *           all proactive offers (kill switch — DL-2 / R-8).
 * default:  the platform-wide fallback language shown when no preference is known.
 *
 * Source: alkemio.yml → language: { eligible, default }
 * Env overrides: LANGUAGE_ELIGIBLE (comma-separated), LANGUAGE_DEFAULT.
 */
@ObjectType('LanguageConfig')
export class ILanguageConfig {
  @Field(() => [String], {
    nullable: false,
    description:
      'Languages the platform proactively detects, offers, and allows as invitation suggestions — subset of the supported set; empty = all proactive offers disabled.',
  })
  eligible!: string[];

  @Field(() => String, {
    nullable: false,
    description: 'The platform-wide default interface language.',
  })
  default!: string;
}
