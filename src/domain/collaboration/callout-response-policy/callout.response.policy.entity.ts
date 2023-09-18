import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutResponsePolicy } from './callout.response.policy.interface';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutResponseType } from '@common/enums/callout.response.type';

@Entity()
export class CalloutResponsePolicy
  extends BaseAlkemioEntity
  implements ICalloutResponsePolicy
{
  @Column('simple-array')
  allowedResponseTypes!: CalloutResponseType[];

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: CalloutState.OPEN,
  })
  state!: CalloutState;
}
