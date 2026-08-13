/**
 * Helpers for resolving the value a tagset driven by a TagsetTemplate must
 * hold. Shared so every path that materialises a tagset from a template agrees
 * on the same rule; previously the "prefer the declared default, otherwise the
 * first allowed value" rule was re-implemented per call site and several of
 * them trusted `defaultSelectedValue` blindly.
 */

type TagsetTemplateDefinition = {
  allowedValues?: string[];
  defaultSelectedValue?: string;
};

/**
 * Values a tagset may legitimately be set to.
 *
 * Empty strings are discarded: `allowedValues` is a `simple-array` column, and
 * one persisted from an empty array reads back as `['']` rather than `[]`.
 */
export const getSelectableValues = (
  allowedValues: string[] | undefined
): string[] =>
  (allowedValues ?? []).filter(allowedValue => allowedValue !== '');

/**
 * Resolves the value a tagset must fall back to when its current value has no
 * match in the template.
 *
 * `defaultSelectedValue` is only usable when it is itself one of the template's
 * `allowedValues`. It is a nullable column, and
 * `TagsetTemplateService.updateTagsetTemplateDefinition` only overwrites it
 * when the update carries a truthy value — so a template whose allowedValues
 * were replaced can be left pointing at a value that no longer exists, and
 * older templates may carry no default at all.
 *
 * Trusting it blindly leaves the tagset holding a value the template does not
 * know about (or, worse, no value at all). For a Callout's `flow-state`
 * classification that means it matches none of the Space's phases, so the
 * Callout is filtered out of every tab and appears to have vanished
 * (story #6021, and the same root cause as #4970).
 *
 * The first allowed value is the "default state" convention already used by
 * `CalloutsSetService.moveCalloutsToDefaultFlowState` and by the flow-state
 * template bootstrap in `CollaborationService`.
 */
export const resolveDefaultSelectedValue = (
  allowedValues: string[] | undefined,
  declaredDefault: string | undefined
): string | undefined => {
  const selectableValues = getSelectableValues(allowedValues);

  if (selectableValues.length === 0) {
    // Nothing to validate against (e.g. a free-form template): keep whatever
    // default the template declares.
    return declaredDefault || undefined;
  }

  if (declaredDefault && selectableValues.includes(declaredDefault)) {
    return declaredDefault;
  }

  return selectableValues[0];
};

/**
 * {@link resolveDefaultSelectedValue} in the `tags` shape a tagset holds.
 */
export const resolveDefaultTags = (
  tagsetTemplate: TagsetTemplateDefinition
): string[] => {
  const defaultValue = resolveDefaultSelectedValue(
    tagsetTemplate.allowedValues,
    tagsetTemplate.defaultSelectedValue
  );
  return defaultValue ? [defaultValue] : [];
};

/**
 * Returns the template's canonical spelling of `value` when the template allows
 * it, otherwise `undefined`.
 *
 * The match is case-insensitive because `filterCalloutsByClassificationTagsets`
 * matches phase filters case-insensitively: a destination state that differs
 * from the current value only in casing is a match for the client, so treating
 * it as "absent" here would needlessly reset the Callout's state. The template's
 * spelling wins so the stored value stays canonical.
 */
export const matchAllowedValue = (
  allowedValues: string[] | undefined,
  value: string | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  const needle = value.toLowerCase();
  return getSelectableValues(allowedValues).find(
    allowedValue => allowedValue.toLowerCase() === needle
  );
};
