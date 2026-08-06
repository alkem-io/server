import { ActorType } from '@common/enums/actor.type';
import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateCalloutContributorsMapViewInput } from './callout.settings.contributors.mapview.dto.create';

// Partial-update input: every field is OPTIONAL so a caller can update just one
// (e.g. defaultView) without resending the whole block — the server merges into
// the existing config and re-validates the result (≥1 type still enforced by
// CalloutFramingService.validateAndNormalizeContributorsSettings). The required
// create-time counterpart is CreateCalloutContributorsSettingsInput.
@InputType()
export class UpdateCalloutContributorsSettingsInput {
  @Field(() => [ActorType], {
    nullable: true,
    description:
      'When provided, replaces the selected contributor types (at least one).',
  })
  @IsOptional()
  @ArrayMinSize(1, {
    message: 'At least one contributor type must be selected.',
  })
  @IsEnum(ActorType, { each: true })
  contributorTypes?: ActorType[];

  @Field(() => ActorType, {
    nullable: true,
    description:
      'The default contributor type (one of contributorTypes). Defaults to the first selected type.',
  })
  @IsOptional()
  @IsEnum(ActorType)
  defaultContributorType?: ActorType;

  @Field(() => ContributorCollectionView, {
    nullable: true,
    description:
      'The default display mode. Defaults to LIST; MAP requires a locatable contributor type.',
  })
  @IsOptional()
  @IsEnum(ContributorCollectionView)
  defaultView?: ContributorCollectionView;

  @Field(() => CreateCalloutContributorsMapViewInput, {
    nullable: true,
    description:
      'Admin-fixed initial map view. Omitted ⇒ stored view unchanged; explicit null ⇒ clear to automatic framing.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCalloutContributorsMapViewInput)
  mapView?: CreateCalloutContributorsMapViewInput | null;
}
