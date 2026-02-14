import { LicenseType } from '@common/enums/license.type';
import { AuthorizableEntity } from '../entity/authorizable-entity';
import { LicenseEntitlement } from '../license-entitlement/license.entitlement.entity';
import { ILicense } from './license.interface';

export class License extends AuthorizableEntity implements ILicense {
  entitlements?: LicenseEntitlement[];

  type!: LicenseType;
}
