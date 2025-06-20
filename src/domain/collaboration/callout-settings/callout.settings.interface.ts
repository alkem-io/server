import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';

@ObjectType('CalloutSettings')
export abstract class ICalloutSettings extends IAuthorizable {
  contribution!: ICalloutSettingsContribution;
  visibility!: CalloutVisibility;
}
