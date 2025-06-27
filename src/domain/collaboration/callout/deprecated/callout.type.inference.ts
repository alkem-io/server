import { CalloutType } from '@common/enums/callout.type';
import { ICallout } from '../callout.interface';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

/**
 * @deprecated
 * TODO: CalloutType is deprecated, remove this logic when possible
 */
export const inferCalloutType = (callout: ICallout): CalloutType => {
  if (callout.framing.type === CalloutFramingType.WHITEBOARD) {
    return CalloutType.WHITEBOARD;
  }
  const allowedTypes = callout?.settings?.contribution?.allowedTypes ?? [];
  if (allowedTypes.includes(CalloutContributionType.POST)) {
    return CalloutType.POST_COLLECTION;
  }
  if (allowedTypes.includes(CalloutContributionType.WHITEBOARD)) {
    return CalloutType.WHITEBOARD_COLLECTION;
  }
  if (allowedTypes.includes(CalloutContributionType.LINK)) {
    return CalloutType.LINK_COLLECTION;
  }
  return CalloutType.POST;
};
