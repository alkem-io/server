import { mergeWith, omit } from 'lodash';

/**
 * Merge rule shared by both places CalloutService folds caller-supplied
 * settings into a settings object (the defaults on create, the stored row on
 * update).
 *
 * Three departures from a plain deep merge:
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
 *   stored value stays.
 * - An explicit `null` on the `framing.spaces` or `framing.selection` block
 *   also means "not provided": the stored block stays. Both blocks are
 *   non-nullable on output, so their normalizers would otherwise silently
 *   re-default a nulled block (EXPANDED → COMPACT, CUSTOM [a,b] → AUTO []).
 *
 * Every other object-valued block keeps the default behaviour, so clearing an
 * optional block such as `contributors.mapView` with `null` still works.
 */
function isPlainObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `framing` blocks for which an explicit `null` means "not provided". */
const NULL_MEANS_NOT_PROVIDED_FRAMING_BLOCKS = ['spaces', 'selection'];

export function calloutSettingsMergeCustomizer(
  existing: unknown,
  incoming: unknown
): unknown {
  if (Array.isArray(incoming)) return incoming;
  if (incoming === null && !isPlainObjectValue(existing)) return existing;
  return undefined;
}

/**
 * Drop an explicitly-null `framing.spaces` / `framing.selection` block from a
 * settings input, without mutating the input (callers read it again after the
 * merge).
 */
function withoutNullFramingBlocks(source: object): object {
  const framing = (source as { framing?: unknown }).framing;
  if (!isPlainObjectValue(framing)) return source;
  const nullBlocks = NULL_MEANS_NOT_PROVIDED_FRAMING_BLOCKS.filter(
    key => (framing as Record<string, unknown>)[key] === null
  );
  if (nullBlocks.length === 0) return source;
  return { ...source, framing: omit(framing as object, nullBlocks) };
}

/**
 * Fold `source` (a settings input) into `target` (a settings object) under
 * {@link calloutSettingsMergeCustomizer}. Mutates and returns `target`, like
 * lodash `merge`.
 */
export function mergeCalloutSettings<T extends object>(
  target: T,
  source: object | undefined
): T {
  if (!source) return target;
  return mergeWith(
    target,
    withoutNullFramingBlocks(source),
    calloutSettingsMergeCustomizer
  );
}
