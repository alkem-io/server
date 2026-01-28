import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IOrganizationVerification } from './organization.verification.interface';

@Entity()
export class OrganizationVerification
  extends AuthorizableEntity
  implements IOrganizationVerification
{
  @Column('varchar', { length: UUID_LENGTH, nullable: false })
  organizationID!: string;

  @Column('varchar', {
    default: OrganizationVerificationEnum.NOT_VERIFIED,
    length: ENUM_LENGTH,
  })
  status!: OrganizationVerificationEnum;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;
}
