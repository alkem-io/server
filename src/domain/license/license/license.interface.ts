import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('License')
export abstract class ILicense extends IAuthorizable {
  featureFlags!: string;
}
