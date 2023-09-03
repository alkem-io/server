import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutResponseDefaults } from './callout.response.defaults.interface';

@Entity()
export class CalloutResponseDefaults
  extends BaseAlkemioEntity
  implements ICalloutResponseDefaults
{
  @Column('text', { nullable: true })
  description? = '';
}
