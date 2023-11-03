import { SpaceVisibility } from '@common/enums/space.visibility';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ILicenseFeatureFlag } from '../feature-flag/feature.flag.interface';

@ObjectType('License')
export abstract class ILicense extends IAuthorizable {
  featureFlags?: ILicenseFeatureFlag[];

  @Field(() => SpaceVisibility, {
    description: 'Visibility of the Space.',
    nullable: false,
  })
  visibility!: SpaceVisibility;
}
