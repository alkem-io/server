import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ICalloutSettingsFraming } from '../callout-settings-framing/callout.settings.framing.interface';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';

@ObjectType('CalloutSettings')
export abstract class ICalloutSettings extends IAuthorizable {
  framing!: ICalloutSettingsFraming;
  contribution!: ICalloutSettingsContribution;
  visibility!: CalloutVisibility;
}
