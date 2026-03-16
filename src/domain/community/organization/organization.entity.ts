import { ActorType } from '@common/enums/actor.type';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import {
  ChildEntity,
  Column,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { OrganizationVerification } from '../organization-verification/organization.verification.entity';
import { IOrganization } from './organization.interface';

@ChildEntity({
  discriminatorValue: ActorType.ORGANIZATION,
  tableName: 'organization',
})
export class Organization extends Actor implements IOrganization, IGroupable {
  // Inherited from Actor (on actor table):
  //   id, type, nameID, profile, authorization, credentials, createdDate, updatedDate, version

  @Column('uuid', { nullable: false })
  accountID!: string;

  @Column('jsonb', { nullable: false })
  settings!: IOrganizationSettings;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.organization,
    {
      eager: false,
      cascade: true,
    }
  )
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

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;
}
