import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Application } from '@domain/community/application/application.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { UUID_LENGTH } from '@src/common/constants/entity.field.length.constants';
import { CommunityPolicy } from '../community-policy/community.policy.entity';
import { Form } from '@domain/common/form/form.entity';
import { Invitation } from '../invitation/invitation.entity';
import { CommunityGuidelines } from '../community-guidelines/community.guidelines.entity';
import { PlatformInvitation } from '@platform/invitation/platform.invitation.entity';

@Entity()
export class Community
  extends AuthorizableEntity
  implements ICommunity, IGroupable
{
  @OneToOne(() => Communication, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communication?: Communication;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidelines?: CommunityGuidelines;

  @OneToOne(() => Form, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  applicationForm?: Form;

  @OneToMany(() => UserGroup, userGroup => userGroup.community, {
    eager: false,
    cascade: true,
  })
  groups?: UserGroup[];

  @OneToMany(() => Application, application => application.community, {
    eager: false,
    cascade: true,
  })
  applications?: Application[];

  @OneToMany(() => Invitation, invitation => invitation.community, {
    eager: false,
    cascade: true,
  })
  invitations?: Invitation[];

  @OneToMany(
    () => PlatformInvitation,
    platformInvitation => platformInvitation.community,
    {
      eager: false,
      cascade: true,
    }
  )
  platformInvitations?: PlatformInvitation[];

  @OneToOne(() => CommunityPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  policy!: CommunityPolicy;

  // The parent community can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => Community, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentCommunity?: Community;

  @Column({
    length: UUID_LENGTH,
  })
  parentID!: string;

  constructor() {
    super();
    this.parentID = '';
  }
}
