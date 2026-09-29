import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalloutForm } from './callout.form.interface';
import { ICalloutFormQuestion } from './callout.form.question.interface';
import { ICalloutFormSettings } from './callout.form.settings.interface';

/**
 * Definition fields only. This resolver must never expose a response, a
 * response count or anything derived from them.
 */
@Resolver(() => ICalloutForm)
export class CalloutFormResolverFields {
  @ResolveField('questions', () => [ICalloutFormQuestion], {
    nullable: false,
    description: 'The ordered questions of the Form.',
  })
  questions(@Parent() form: ICalloutForm): ICalloutFormQuestion[] {
    return form.questions;
  }

  @ResolveField('settings', () => ICalloutFormSettings, {
    nullable: false,
    description: 'The settings of the Form.',
  })
  settings(@Parent() form: ICalloutForm): ICalloutFormSettings {
    return {
      visibility: form.visibility,
      responseMode: form.responseMode,
      state: form.state,
    };
  }
}
