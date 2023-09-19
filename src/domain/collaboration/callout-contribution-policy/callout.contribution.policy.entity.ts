import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ICalloutContributionPolicy } from './callout.contribution.policy.interface';

@Entity()
export class CalloutContributionPolicy
  extends BaseAlkemioEntity
  implements ICalloutContributionPolicy
{
  @Column('simple-array')
  allowedContributionTypes!: CalloutContributionType[];

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: CalloutState.OPEN,
  })
  state!: CalloutState;
}
