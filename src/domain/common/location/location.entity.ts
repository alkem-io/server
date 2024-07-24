import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '../entity/base-entity/base.alkemio.entity';
import { ILocation } from './location.interface';

@Entity()
export class Location extends BaseAlkemioEntity implements ILocation {
  // todo these can be nullable
  @Column('varchar', { length: 255, nullable: false })
  city!: string;

  @Column('varchar', { length: 255, nullable: false })
  country!: string;

  @Column('varchar', { length: 255, nullable: false })
  addressLine1!: string;

  @Column('varchar', { length: 128, nullable: false })
  addressLine2!: string;

  @Column('varchar', { length: 128, nullable: false })
  stateOrProvince!: string;

  @Column('varchar', { length: 128, nullable: false })
  postalCode!: string;

  constructor() {
    super();
  }
}
