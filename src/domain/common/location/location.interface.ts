import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity/base.alkemio.interface';
import { IGeoLocation } from './geolocation.interface';

@ObjectType('Location')
export abstract class ILocation extends IBaseAlkemio {
  // todo: match entity
  @Field(() => String, {
    nullable: true,
    description: 'City of the location.',
  })
  city?: string;

  @Field(() => String, {
    nullable: true,
  })
  country?: string;

  @Field(() => String, {
    nullable: true,
  })
  addressLine1?: string;

  @Field(() => String, {
    nullable: true,
  })
  addressLine2?: string;

  @Field(() => String, {
    nullable: true,
  })
  stateOrProvince?: string;

  @Field(() => String, {
    nullable: true,
  })
  postalCode?: string;

  // Cache of the calculate geolocation, exposed through field resolver to allow retrieval on demand
  geoLocation!: IGeoLocation;
}
