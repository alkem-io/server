import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';

/**
 * Structural shape covering both `ICallout` (entity) and `CreateCalloutInput` (DTO).
 * Only the framing type and the allowed contribution types are inspected — the
 * smallest surface that lets the Office Docs entitlement gate decide whether
 * the introduction needs to be checked (FR-004).
 */
export interface CollaboraGateProbe {
  framing?: { type?: CalloutFramingType };
  settings?: { contribution?: { allowedTypes?: CalloutContributionType[] } };
  contributions?: Array<{ type?: CalloutContributionType }>;
}

/**
 * Returns true when the given Callout-shaped value would introduce a Collabora
 * Document into a Collaboration — either as the callout's framing, as an
 * allowed contribution type, or via an attached contribution payload.
 */
export const introducesCollaboraDocument = (
  callout: CollaboraGateProbe
): boolean => {
  if (callout.framing?.type === CalloutFramingType.COLLABORA_DOCUMENT) {
    return true;
  }
  const allowedTypes = callout.settings?.contribution?.allowedTypes;
  if (
    Array.isArray(allowedTypes) &&
    allowedTypes.includes(CalloutContributionType.COLLABORA_DOCUMENT)
  ) {
    return true;
  }
  if (
    callout.contributions?.some(
      contribution =>
        contribution.type === CalloutContributionType.COLLABORA_DOCUMENT
    )
  ) {
    return true;
  }
  return false;
};
