import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * CREATE-time card-variant settings for a SPACES (Subspaces) collection
 * callout. Optional; the normalizer defaults a missing value to COMPACT.
 *
 * Dual-decorated (@InputType + @ObjectType) so it can nest inside the dual
 * CreateCalloutSettingsFramingData, matching the contributors/selection pattern.
 */
@InputType()
@ObjectType('CreateCalloutSpacesSettingsData')
export class CreateCalloutSpacesSettingsInput {
  @Field(() => SpaceCollectionCardVariant, {
    nullable: true,
    description:
      'The card variant (COMPACT or EXPANDED). Defaults to COMPACT when omitted.',
  })
  @IsOptional()
  @IsEnum(SpaceCollectionCardVariant)
  cardVariant?: SpaceCollectionCardVariant;
}
