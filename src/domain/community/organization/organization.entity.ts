import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IOrganization } from './organization.interface';
import { OrganizationVerification } from '../organization-verification/organization.verification.entity';
import { PreferenceSet } from '@domain/common/preference-set';
import { ContributorBase } from '../contributor/contributor.base.entity';

@Entity()
export class Organization
  extends ContributorBase
  implements IOrganization, IGroupable
{
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToMany(() => UserGroup, userGroup => userGroup.organization, {
    eager: false,
    cascade: true,
  })
  groups?: UserGroup[];

  @Column()
  legalEntityName?: string = '';

  @Column()
  domain?: string = '';

  @Column()
  website?: string = '';

  @Column()
  contactEmail?: string = '';

  @OneToOne(() => OrganizationVerification, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  verification!: OrganizationVerification;

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;

  constructor() {
    super();
  }
}
