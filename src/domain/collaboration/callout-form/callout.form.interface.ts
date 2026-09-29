import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { ObjectType } from '@nestjs/graphql';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { ICalloutFormQuestion } from './callout.form.question.interface';

/**
 * The DEFINITION of a Form only. No response, response count or response
 * field may ever be declared on this type: responses are reachable solely
 * through the lookup root (see CalloutFormResponses).
 * `questions` and `settings` are exposed through field resolvers.
 */
@ObjectType('CalloutForm')
export abstract class ICalloutForm extends IBaseAlkemio {
  questions!: ICalloutFormQuestion[];

  visibility!: CalloutFormResponseVisibility;

  responseMode!: CalloutFormResponseMode;

  state!: CalloutFormState;

  framing?: ICalloutFraming;
}
