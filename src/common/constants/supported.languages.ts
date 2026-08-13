/**
 * The stable set of interface languages supported by Alkemio.
 * This is the SUPPORTED set — distinct from the ELIGIBLE set (subset, config-driven,
 * used for proactive detection/offers; configured via alkemio.yml → language.eligible).
 *
 * The user may persist any language from this set as their account preference.
 * The eligible set is a subset of this list used only for proactive detection
 * and invitation suggestions.
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

/**
 * Returns true if `lang` is in SUPPORTED_INTERFACE_LANGUAGES.
 * Pure — no logging, no side effects.
 */
export function isSupportedInterfaceLanguage(lang: string): boolean {
  return (SUPPORTED_INTERFACE_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Parses a comma-separated eligible-language string, trims entries, drops
 * empties, deduplicates, and keeps ONLY values in SUPPORTED_INTERFACE_LANGUAGES.
 *
 * Pure — no logging. This helper has already removed unsupported values from
 * its result, so callers that need to warn on dropped entries must inspect the
 * RAW entries before parsing, e.g.
 * `raw.split(',').map(s => s.trim()).filter(l => l.length > 0 && !isSupportedInterfaceLanguage(l))`.
 *
 * @param raw - The raw comma-separated string from config (e.g. `"nl,de,fr"`).
 *              `undefined` or empty string → returns `[]`.
 */
export function parseSupportedEligibleLanguages(
  raw: string | undefined
): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw.split(',')) {
    const lang = entry.trim();
    if (
      lang.length > 0 &&
      isSupportedInterfaceLanguage(lang) &&
      !seen.has(lang)
    ) {
      seen.add(lang);
      result.push(lang);
    }
  }
  return result;
}

/**
 * Resolves the default interface language from config.
 *
 * Returns `raw` if it is in SUPPORTED_INTERFACE_LANGUAGES; otherwise returns
 * `fallback` (default `'en'`). Pure — no logging.
 *
 * @param raw - The raw default language from config.
 * @param fallback - Value to use when `raw` is unset or unsupported. Defaults to `'en'`.
 */
export function resolveSupportedDefaultLanguage(
  raw: string | undefined,
  fallback = 'en'
): string {
  if (raw !== undefined && isSupportedInterfaceLanguage(raw)) return raw;
  return fallback;
}
