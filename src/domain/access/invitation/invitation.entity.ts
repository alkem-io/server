import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IInvitation } from './invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { ENUM_LENGTH, LONGER_TEXT_LENGTH } from '@common/constants';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { RoleName } from '@common/enums/role.name';
@Entity()
export class Invitation extends AuthorizableEntity implements IInvitation {
  // todo ID in migration is varchar - must be char(36)
  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Column('uuid', { nullable: false })
  invitedContributorID!: string;

  @Column('uuid', { nullable: false })
  createdBy!: string;

  @Column('varchar', { length: LONGER_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  invitedToParent!: boolean;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  contributorType!: RoleSetContributorType;

  @ManyToOne(() => RoleSet, roleSet => roleSet.invitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  roleSet?: RoleSet;

  @Column('simple-array', { nullable: false })
  extraRoles!: RoleName[];
}
