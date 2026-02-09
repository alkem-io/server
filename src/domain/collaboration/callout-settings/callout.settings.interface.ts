import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutSettingsContribution } from './callout.settings.contribution.interface';
import { ICalloutSettingsFraming } from './callout.settings.framing.interface';

@ObjectType('CalloutSettings')
export abstract class ICalloutSettings {
  @Field(() => ICalloutSettingsFraming, {
    description: 'Callout Framing Settings.',
    nullable: false,
  })
  framing!: ICalloutSettingsFraming;

  @Field(() => ICalloutSettingsContribution, {
    description: 'Callout Contribution Settings.',
    nullable: false,
  })
  contribution!: ICalloutSettingsContribution;

  @Field(() => CalloutVisibility, {
    description: 'Callout Visibility.',
    nullable: false,
  })
  visibility!: CalloutVisibility;
}
