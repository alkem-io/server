import { Field, InputType } from '@nestjs/graphql';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { IFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';

@InputType()
export class UpdateLicenseInput {
  @Field(() => UpdateContextInput, {
    nullable: false,
    description: 'Update the feature flags for the License.',
  })
  featureFlags!: IFeatureFlag[];
}
