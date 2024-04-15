import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('License')
export abstract class ILicensePolicy extends IAuthorizable {
  // exposed via field resolver
  featureFlagRules!: string;
}
