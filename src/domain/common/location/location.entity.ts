import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '../entity/base-entity/base.alkemio.entity';
import { ILocation } from './location.interface';

@Entity()
export class Location extends BaseAlkemioEntity implements ILocation {
  @Column('varchar', { length: 255, nullable: true })
  city = '';

  @Column('varchar', { length: 255, nullable: true })
  country = '';

  @Column('varchar', { length: 255, nullable: true })
  addressLine1 = '';

  @Column('varchar', { length: 255, nullable: true })
  addressLine2 = '';

  @Column('varchar', { length: 255, nullable: true })
  stateOrProvince = '';

  @Column('varchar', { length: 255, nullable: true })
  postalCode = '';
}
