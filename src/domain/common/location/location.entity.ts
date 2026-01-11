import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ILocation } from './location.interface';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { IGeoLocation } from './geolocation.interface';

@Entity()
export class Location extends BaseAlkemioEntity implements ILocation {
  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  city?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  country?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  addressLine1?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  addressLine2?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  stateOrProvince?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  postalCode?: string;

  @Column('jsonb', { nullable: false })
  geoLocation!: IGeoLocation;
}
