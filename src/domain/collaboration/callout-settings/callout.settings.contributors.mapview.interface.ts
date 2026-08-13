import { Field, Float, ObjectType } from '@nestjs/graphql';

/**
 * Admin-fixed initial map view for a Contributors-collection callout's map.
 * Absent/null ⇒ automatic framing (fit to plotted contributors; Europe fallback).
 *
 * Three-float camera position: center (longitude, latitude) + zoom level.
 * Field names follow the codebase longitude/latitude convention.
 */
@ObjectType('CalloutContributorsMapView')
export abstract class ICalloutContributorsMapView {
  @Field(() => Float, {
    nullable: false,
    description: 'Map center longitude. Finite, within [-180, 180].',
  })
  longitude!: number;

  @Field(() => Float, {
    nullable: false,
    description: 'Map center latitude. Finite, within [-90, 90].',
  })
  latitude!: number;

  @Field(() => Float, {
    nullable: false,
    description: 'Map zoom level. Finite, within [0, 22].',
  })
  zoom!: number;
}
