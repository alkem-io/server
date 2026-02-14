import { BaseAlkemioEntity } from '../entity/base-entity/base.alkemio.entity';
import { IGeoLocation } from './geolocation.interface';
import { ILocation } from './location.interface';

export class Location extends BaseAlkemioEntity implements ILocation {
  city?: string;

  country?: string;

  addressLine1?: string;

  addressLine2?: string;

  stateOrProvince?: string;

  postalCode?: string;

  geoLocation!: IGeoLocation;
}
