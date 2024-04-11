import { Field, InputType } from '@nestjs/graphql';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IsOptional } from 'class-validator';
import { UpdateFeatureFlagInput } from '@domain/license/feature-flag/dto/feature.flag.dto.update';

@InputType()
export class CreateLicenseInput {
  @Field(() => [UpdateFeatureFlagInput], {
    nullable: true,
    description: 'Update the feature flags for the License.',
  })
  @IsOptional()
  featureFlags?: UpdateFeatureFlagInput[];

  @Field(() => SpaceVisibility, {
    nullable: true,
    description: 'Visibility of the Space.',
  })
  @IsOptional()
  visibility?: SpaceVisibility;
}
