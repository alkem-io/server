import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';

/**
 * Audience width of a Form's response visibility: ADMINS (0) is narrower than
 * MEMBERS (1). The submit-time acknowledgement guards against a widening the
 * respondent was not shown; the setting itself may change at any time (R19b).
 */
export const widthOf = (visibility: CalloutFormResponseVisibility): number =>
  visibility === CalloutFormResponseVisibility.MEMBERS ? 1 : 0;
