import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Library } from '@library/library/library.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Forum } from '@platform/forum/forum.entity';
import { TemplatesManager } from '@domain/template/templates-manager/templates.manager.entity';
import { LicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {
  @Column('json', { nullable: false })
  settings!: IPlatformSettings;

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

  @OneToOne(() => VirtualContributor, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidanceVirtualContributor?: VirtualContributor;

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;
}
