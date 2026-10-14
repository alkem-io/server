import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutForm } from '../callout-form/callout.form.interface';
import { ICalloutFormAnswer } from './callout.form.response.answer.interface';

/**
 * A response is reachable only through the lookup root and mutation payloads.
 * It must never be declared as a field type on Callout, CalloutFraming or
 * CalloutForm.
 */
@ObjectType('CalloutFormResponse')
export class ICalloutFormResponse {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => Date, {
    nullable: false,
    description: 'When the response was submitted.',
  })
  createdDate!: Date;

  // Exposed through a field resolver: null after the submitter's account was deleted.
  createdBy?: string | null;

  @Field(() => [ICalloutFormAnswer], {
    nullable: false,
    description:
      'The answers, snapshotted from the Form definition at submission. Unanswered optional questions have no entry.',
  })
  answers!: ICalloutFormAnswer[];

  formId!: string;

  form?: ICalloutForm;
}
