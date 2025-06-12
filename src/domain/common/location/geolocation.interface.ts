import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('GeoLocation')
export abstract class IGeoLocation {
  @Field(() => Number, {
    nullable: true,
    description:
      'The Longitude for this Location, derived from (City, Country) if those are set.',
  })
  longitude?: number;

  @Field(() => Number, {
    nullable: true,
    description:
      'The Latitude for this Location, derived from (City, Country) if those are set.',
  })
  latitude?: number;

  isValid!: boolean;
}
