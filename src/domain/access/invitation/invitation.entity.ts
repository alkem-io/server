import { LONGER_TEXT_LENGTH } from '@common/constants';
import { RoleName } from '@common/enums/role.name';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IInvitation } from './invitation.interface';

@Entity()
export class Invitation extends AuthorizableEntity implements IInvitation {
  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Column('uuid', { nullable: false })
  invitedActorId!: string;

  @ManyToOne(() => Actor, { eager: false, cascade: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedActorId' })
  invitedActor?: Actor;

  @Column('uuid', { nullable: false })
  createdBy!: string;

  @ManyToOne(() => Actor, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdBy' })
  createdByActor?: Actor;

  @Column('varchar', { length: LONGER_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  invitedToParent!: boolean;

  @ManyToOne(
    () => RoleSet,
    roleSet => roleSet.invitations,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  roleSet?: RoleSet;

  @Column('simple-array', { nullable: false })
  extraRoles!: RoleName[];
}
