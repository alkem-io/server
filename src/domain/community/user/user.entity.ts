import { randomUUID } from 'node:crypto';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { Application } from '@domain/access/application/application.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { IUser } from '@domain/community/user/user.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import {
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserSettings } from '../user-settings/user.settings.entity';

@Entity('user')
export class User extends BaseAlkemioEntity implements IUser {
  constructor() {
    super();
    const id = randomUUID();
    this.id = id;
    // Always initialize actor so setters work without explicit actor assignment
    const actor = new Actor();
    actor.type = ActorType.USER;
    actor.id = id;
    this.actor = actor;
  }

  // Actor relation — shared primary key (user.id = actor.id)
  @OneToOne(() => Actor, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  actor?: Actor;

  // Transparent getters delegating to actor
  get type(): ActorType {
    return this.actor?.type as ActorType;
  }

  get authorization(): AuthorizationPolicy | undefined {
    return this.actor?.authorization;
  }

  set authorization(auth: AuthorizationPolicy | undefined) {
    if (!this.actor) this.actor = new Actor();
    this.actor.authorization = auth;
  }

  get credentials(): Credential[] | undefined {
    return this.actor?.credentials;
  }

  get profile(): Profile {
    return this.actor?.profile as Profile;
  }

  set profile(p: Profile) {
    if (!this.actor) this.actor = new Actor();
    this.actor.profile = p;
  }

  get nameID(): string {
    return this.actor?.nameID as string;
  }

  set nameID(val: string) {
    if (!this.actor) this.actor = new Actor();
    this.actor.nameID = val;
  }

  @Column('uuid', { nullable: false })
  accountID!: string;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  firstName!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  lastName!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false, unique: true })
  email!: string;

  @Column('varchar', {
    length: SMALL_TEXT_LENGTH,
    nullable: true,
  })
  phone?: string;

  @Index()
  @Column('uuid', {
    nullable: true,
    unique: true,
  })
  authenticationID!: string | null;

  @Column({ type: 'boolean', nullable: false })
  serviceProfile!: boolean;

  @OneToMany(
    () => Application,
    application => application.id,
    {
      eager: false,
      cascade: false,
    }
  )
  applications?: Application[];

  @OneToOne(() => UserSettings, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  settings!: UserSettings;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;
}
