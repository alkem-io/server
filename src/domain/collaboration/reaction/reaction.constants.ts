/**
 * The platform's positive/encouraging emoji set for callout reactions, expressed
 * as stable slugs. Slugs are locale-safe and rename-safe; clients own the
 * slug-to-glyph mapping and silently skip any slug they cannot render.
 *
 * This list is the single source of truth for which emojis are allowed. The
 * API surfaces it per-callout so clients always render exactly this set.
 * To widen or narrow the set, change only this constant — stored reactions
 * with now-removed slugs remain valid history; the allow-list check applies
 * only to new writes.
 */
export const CALLOUT_REACTION_ALLOWED_EMOJIS: readonly string[] = [
  'heart',
  'hugging-face',
  'clapping-hands',
  'light-bulb',
  'bullseye',
  'check-mark',
  'rocket',
] as const;
