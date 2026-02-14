import { Classification } from '@domain/common/classification/classification.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import { CalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutFraming } from '../callout-framing/callout.framing.entity';
import { ICalloutSettings } from '../callout-settings/callout.settings.interface';
import { CalloutsSet } from '../callouts-set/callouts.set.entity';
import { ICallout } from './callout.interface';

export class Callout extends AuthorizableEntity implements ICallout {
  nameID!: string;

  isTemplate!: boolean;

  createdBy?: string;

  framing!: CalloutFraming;

  settings!: ICalloutSettings;

  classification!: Classification;

  contributionDefaults?: CalloutContributionDefaults;

  contributions?: CalloutContribution[];

  comments!: Room;

  calloutsSet?: CalloutsSet;

  sortOrder!: number;

  activity!: number;

  publishedBy?: string;

  publishedDate?: Date;

  constructor() {
    super();
    this.framing = new CalloutFraming();
  }
}
