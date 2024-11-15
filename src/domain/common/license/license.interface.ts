import { LicenseType } from '@common/enums/license.type';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../entity/authorizable-entity';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';

@ObjectType('License')
export abstract class ILicense extends IAuthorizable {
  @Field(() => LicenseType, {
    nullable: true,
    description: 'The type of entity that this License is being used with.',
  })
  type!: LicenseType;

  entitlements?: ILicenseEntitlement[];
}
