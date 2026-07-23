/**
 * The stable set of interface languages supported by Alkemio.
 * This is the SUPPORTED set — distinct from the ELIGIBLE set (subset, config-driven,
 * used for proactive detection/offers). See plan.md → C2 (config-language contract).
 *
 * The user may persist any language from this set as their account preference (FR-008).
 * The eligible set (in alkemio.yml: language.eligible) is a subset of this list used
 * only for proactive detection and invitation suggestions.
 */
export const SUPPORTED_INTERFACE_LANGUAGES = [
  'en',
  'nl',
  'es',
  'bg',
  'de',
  'fr',
] as const;

export type SupportedInterfaceLanguage =
  (typeof SUPPORTED_INTERFACE_LANGUAGES)[number];
