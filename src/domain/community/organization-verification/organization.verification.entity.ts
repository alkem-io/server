import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class OrganizationVerification
  extends AuthorizableEntity
  implements IOrganizationVerification
{
  @Column('uuid', { nullable: false })
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
