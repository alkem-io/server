import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Messaging } from '@domain/communication/messaging/messaging.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { TemplatesManager } from '@domain/template/templates-manager/templates.manager.entity';
import { Library } from '@library/library/library.entity';
import { Forum } from '@platform/forum/forum.entity';
import { LicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.entity';
import { IPlatformWellKnownVirtualContributors } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.interface';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {
  @Column('jsonb', { nullable: false })
  settings!: IPlatformSettings;

  @Column('jsonb', { nullable: false })
  wellKnownVirtualContributors!: IPlatformWellKnownVirtualContributors;

  @OneToOne(() => Forum, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  forum?: Forum;

  @OneToOne(() => Library, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  library?: Library;

  @OneToOne(() => TemplatesManager, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesManager?: TemplatesManager;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator!: StorageAggregator;

  @OneToOne(() => LicensingFramework, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licensingFramework?: LicensingFramework;

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;

  @OneToOne(() => Messaging, {
    eager: false,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  messaging?: Messaging;
}
