import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Role } from '../role/role.entity';
import { Form } from '@domain/common/form/form.entity';
import { PlatformInvitation } from '@platform/invitation/platform.invitation.entity';
import { IRoleManager } from './role.manager.interface';
import { Application } from '@domain/community/application/application.entity';
import { Invitation } from '@domain/community/invitation/invitation.entity';

@Entity()
export class RoleManager
  extends AuthorizableEntity
  implements IRoleManager, IGroupable
{
  @OneToOne(() => Form, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  applicationForm?: Form;

  @OneToMany(() => Role, role => role.manager, {
    eager: false,
    cascade: true,
  })
  roles?: Role[];

  @OneToMany(() => Application, application => application.roleManager, {
    eager: false,
    cascade: true,
  })
  applications?: Application[];

  @OneToMany(() => Invitation, invitation => invitation.roleManager, {
    eager: false,
    cascade: true,
  })
  invitations?: Invitation[];

  @OneToMany(
    () => PlatformInvitation,
    platformInvitation => platformInvitation.roleManager,
    {
      eager: false,
      cascade: true,
    }
  )
  platformInvitations?: PlatformInvitation[];

  // The parent roleManager can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => RoleManager, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentRoleManager?: RoleManager;
}
