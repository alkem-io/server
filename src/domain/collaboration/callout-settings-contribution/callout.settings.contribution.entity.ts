import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ICalloutSettingsContribution } from './callout.settings.contribution.interface';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class CalloutSettingsContribution
  extends BaseAlkemioEntity
  implements ICalloutSettingsContribution
{
  @Column('simple-array')
  allowedContributionTypes!: CalloutContributionType[];

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  state!: CalloutState;
}
