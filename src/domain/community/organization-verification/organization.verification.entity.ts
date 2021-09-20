import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class OrganizationVerification
  extends AuthorizableEntity
  implements IOrganizationVerification
{
  @Column()
  organizationID!: string;

  @Column({ default: OrganizationVerificationEnum.NOT_VERIFIED })
  status!: string;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;
}
