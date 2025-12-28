import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
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

  @Field(() => IGeoLocation, {
    nullable: false,
    description:
      'The GeoLocation for this Location, derived from (City, Country) if those are set.',
  })
  geoLocation!: IGeoLocation;
}
