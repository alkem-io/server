import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ICalloutContributionPolicy } from './callout.contribution.policy.interface';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class CalloutContributionPolicy
  extends BaseAlkemioEntity
  implements ICalloutContributionPolicy
{
  @Column('simple-array')
  allowedContributionTypes!: CalloutContributionType[];

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  state!: CalloutState;
}
