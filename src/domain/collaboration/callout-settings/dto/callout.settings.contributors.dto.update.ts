import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { ContributorType } from '@common/enums/contributor.type';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayMinSize, IsEnum, IsOptional } from 'class-validator';

@InputType()
export class UpdateCalloutContributorsSettingsInput {
  @Field(() => [ContributorType], {
    nullable: false,
    description:
      'The contributor types to include. At least one type is required.',
  })
  @ArrayMinSize(1, {
    message: 'At least one contributor type must be selected.',
  })
  @IsEnum(ContributorType, { each: true })
  contributorTypes!: ContributorType[];

  @Field(() => ContributorType, {
    nullable: true,
    description:
      'The default contributor type (one of contributorTypes). Defaults to the first selected type.',
  })
  @IsOptional()
  @IsEnum(ContributorType)
  defaultContributorType?: ContributorType;

  @Field(() => ContributorCollectionView, {
    nullable: true,
    description:
      'The default display mode. Defaults to LIST; MAP requires a locatable contributor type.',
  })
  @IsOptional()
  @IsEnum(ContributorCollectionView)
  defaultView?: ContributorCollectionView;
}
