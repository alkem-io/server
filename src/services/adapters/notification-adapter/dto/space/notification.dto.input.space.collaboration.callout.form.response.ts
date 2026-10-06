import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A Form response was submitted. Deliberately link-only: it carries the ids
 * and the visibility that was in force under the submit lock, never the
 * answers.
 */
export interface NotificationInputCalloutFormResponseSubmitted
  extends NotificationInputBase {
  callout: ICallout;
  formID: string;
  response: { id: string; createdDate: Date };
  visibility: CalloutFormResponseVisibility;
}
