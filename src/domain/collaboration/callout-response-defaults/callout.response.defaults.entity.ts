import { Column } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutResponseDefaults } from './callout.respnse.defaults.interface';

export class CalloutResponseDefaults
  extends BaseAlkemioEntity
  implements ICalloutResponseDefaults
{
  @Column('text', { nullable: true })
  description? = '';
}
