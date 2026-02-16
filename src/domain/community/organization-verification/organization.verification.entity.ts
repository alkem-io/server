import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IOrganizationVerification } from './organization.verification.interface';

export class OrganizationVerification
  extends AuthorizableEntity
  implements IOrganizationVerification
{
  organizationID!: string;

  status!: OrganizationVerificationEnum;

  lifecycle!: Lifecycle;
}
