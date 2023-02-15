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
import { IApplication } from '@domain/community/application/application.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Application } from '@domain/community/application/application.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { CommunityType } from '@common/enums/community.type';
import {
  TINY_TEXT_LENGTH,
  UUID_LENGTH,
} from '@src/common/constants/entity.field.length.constants';
import { CommunityPolicy } from '../community-policy/community.policy.entity';
import { Form } from '@domain/common/form/form.entity';

@Entity()
export class Community
  extends AuthorizableEntity
  implements ICommunity, IGroupable
{
  @Column()
  displayName: string;

  @Column()
  hubID: string;

  @OneToOne(() => Communication, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communication?: Communication;

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
  applications?: IApplication[];

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
    length: TINY_TEXT_LENGTH,
  })
  type!: CommunityType;

  @Column({
    length: UUID_LENGTH,
  })
  parentID!: string;

  constructor(name: string, type: CommunityType) {
    super();
    this.displayName = name;
    this.type = type;
    this.hubID = '';
    this.parentID = '';
  }
}
