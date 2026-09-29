import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Partial-update card-variant settings: an omitted field leaves the stored
 * value unchanged; a provided field replaces it whole.
 */
@InputType()
export class UpdateCalloutSpacesSettingsInput {
  @Field(() => SpaceCollectionCardVariant, {
    nullable: true,
    description:
      'The card variant (COMPACT or EXPANDED). When omitted, the stored value is unchanged.',
  })
  @IsOptional()
  @IsEnum(SpaceCollectionCardVariant)
  cardVariant?: SpaceCollectionCardVariant;
}
