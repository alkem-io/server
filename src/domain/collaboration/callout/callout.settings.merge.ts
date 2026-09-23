import { mergeWith } from 'lodash';

/**
 * Merge rule shared by both places CalloutService folds caller-supplied
 * settings into a settings object (the defaults on create, the stored row on
 * update).
 *
 * Two departures from a plain deep merge:
 *
 * - Arrays replace wholesale instead of merging element-by-index. A default
 *   merge keeps the longer stored array's tail, so sending a shorter list
 *   (e.g. excluding a contributor type) would silently not persist. Arrays in
 *   settings are config lists, not positional patches.
 * - An explicit `null` never clears a scalar leaf. Every GraphQL input field is
 *   nullable and `@IsOptional()` lets a `null` through, while lodash assigns a
 *   `null` source verbatim (it only skips `undefined`). Without this rule a
 *   caller sending `selection: { mode: null }` or `visibility: null` writes
 *   `null` into a jsonb leaf the schema declares non-null, and every later
 *   read of that callout — and of the whole callouts set around it — fails.
 *   For a scalar or array leaf `null` therefore means "not provided": the
 *   stored value stays. Only an object-valued block keeps the default
 *   behaviour, so clearing an optional block such as `contributors.mapView`
 *   with `null` still works.
 */
function isPlainObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function calloutSettingsMergeCustomizer(
  existing: unknown,
  incoming: unknown
): unknown {
  if (Array.isArray(incoming)) return incoming;
  if (incoming === null && !isPlainObjectValue(existing)) return existing;
  return undefined;
}

/**
 * Fold `source` into `target` under {@link calloutSettingsMergeCustomizer}.
 * Mutates and returns `target`, like lodash `merge`.
 */
export function mergeCalloutSettings<T extends object>(
  target: T,
  source: object | undefined
): T {
  if (!source) return target;
  return mergeWith(target, source, calloutSettingsMergeCustomizer);
}
