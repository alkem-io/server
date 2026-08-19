import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType('ContributorLocation')
export abstract class IContributorLocation {
  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the location has valid stored coordinates (geoLocation.isValid). City/country alone is false.',
  })
  hasValidCoordinates!: boolean;
}
