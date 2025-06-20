import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ICalloutSettingsContribution } from './callout.settings.contribution.interface';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class CalloutSettingsContribution
  extends BaseAlkemioEntity
  implements ICalloutSettingsContribution
{
  @Column('boolean', {
    nullable: false,
    default: true,
  })
  enabled!: boolean;

  @Column('simple-array', {
    nullable: false,
    default: [],
  })
  allowedTypes!: CalloutContributionType[];

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutAllowedContributors.NONE,
  })
  canAddContributions!: CalloutAllowedContributors;

  @Column('boolean', {
    nullable: false,
    default: false,
  })
  commentsEnabled!: boolean;
}
