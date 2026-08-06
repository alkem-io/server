import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { IsNumber, Max, Min } from 'class-validator';

/**
 * Dual-decorated DTO for a Contributors-collection callout's fixed map view.
 *
 * CRASH-GUARD VALIDATORS:
 * MapLibre's LngLat constructor throws on latitude outside ±90, so invalid
 * coordinates crash the map in every viewer's browser, including anonymous.
 * Write-time validation is the primary defence; see also the client-side
 * render guard (isRenderableMapView).
 *
 * The WhiteboardPreviewCoordinatesInput is the anti-precedent: it carries
 * zero validation. This DTO does NOT copy that pattern.
 */
@InputType()
@ObjectType('CreateCalloutContributorsMapViewData')
export class CreateCalloutContributorsMapViewInput {
  @Field(() => Float, {
    nullable: false,
    description: 'Map center longitude. Finite, within [-180, 180].',
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'longitude must be a finite number.' }
  )
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Field(() => Float, {
    nullable: false,
    description:
      'Map center latitude. Finite, within [-90, 90]. MapLibre throws on values outside this range.',
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'latitude must be a finite number.' }
  )
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Field(() => Float, {
    nullable: false,
    description: 'Map zoom level. Finite, within [0, 22].',
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'zoom must be a finite number.' }
  )
  @Min(0)
  @Max(22)
  zoom!: number;
}
