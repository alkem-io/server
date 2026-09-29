import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';

/**
 * Audience width of a Form's response visibility: ADMINS (0) is narrower than
 * MEMBERS (1). Widening is what the submit-time acknowledgement and the
 * settings transition rules guard against.
 */
export const widthOf = (visibility: CalloutFormResponseVisibility): number =>
  visibility === CalloutFormResponseVisibility.MEMBERS ? 1 : 0;
