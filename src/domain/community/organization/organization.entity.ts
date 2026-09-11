import { ActorType } from '@common/enums/actor.type';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import {
  AfterLoad,
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
    nullable: false,
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

  @Column({ nullable: false, default: '' })
  legalEntityName!: string;

  @Column({ nullable: false, default: '' })
  domain!: string;

  @Column({ nullable: false, default: '' })
  website!: string;

  @Column({ nullable: false, default: '' })
  contactEmail!: string;

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

  /**
   * Defend on read for the "allow Spaces to invite this organization"
   * setting. A `settings.membership` object that predates the backfill
   * migration, or was inserted by an old pod during a rolling deploy, lacks
   * this key — without this hook the non-null GraphQL field would surface a
   * null. Runs for every entity load regardless of query path.
   */
  @AfterLoad()
  applyMembershipSettingsDefaults() {
    if (!this.settings?.membership) {
      return;
    }
    this.settings.membership.allowSpaceInvitations ??= true;
  }
}
