import { LicenseType } from '@common/enums/license.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../entity/authorizable-entity';
import { IEntitlement } from '../license-entitlement/entitlement.interface';

@ObjectType('Authorization')
export abstract class ILicense extends IAuthorizable {
  @Field(() => LicenseType, {
    nullable: true,
    description: 'A type of entity that this License is being used with.',
  })
  type!: LicenseType;

  entitlements?: IEntitlement[];
}
