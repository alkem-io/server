import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '../entity/base-entity/base.alkemio.entity';
import { ILocation } from './location.interface';

@Entity()
export class Location extends BaseAlkemioEntity implements ILocation {
  @Column('varchar', { length: 255, nullable: true })
  city = '';

  @Column('varchar', { length: 255, nullable: true })
  country = '';

  constructor(city?: string, country?: string) {
    super();
    this.city = city || '';
    this.country = country || '';
  }
}
