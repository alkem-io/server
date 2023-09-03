import { Column } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutResponsePolicy } from './callout.response.policy.interface';

export class CalloutResponsePolicy
  extends BaseAlkemioEntity
  implements ICalloutResponsePolicy
{
  @Column('simple-array')
  allowedResponseTypes!: string[];

  @Column('boolean', { default: true })
  allowNewResponses = true;
}
