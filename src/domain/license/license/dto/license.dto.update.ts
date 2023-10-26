import { Field, InputType } from '@nestjs/graphql';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { IFeatureFlag } from '@domain/license/feature-flag/feature.flag.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';

@InputType()
export class UpdateLicenseInput {
  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the feature flags for the License.',
  })
  featureFlags?: IFeatureFlag[];

  @Field(() => SpaceVisibility, {
    nullable: true,
    description: 'Visibility of the Space.',
  })
  visibility?: SpaceVisibility;
}
