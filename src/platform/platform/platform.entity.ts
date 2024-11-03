import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Library } from '@library/library/library.entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Forum } from '@platform/forum/forum.entity';
import { PlatformInvitation } from '@platform/invitation/platform.invitation.entity';
import { TemplatesManager } from '@domain/template/templates-manager/templates.manager.entity';
import { LicensingFramework } from '@platform/licensing-framework/licensing.framework.entity';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {
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

  @OneToMany(
    () => PlatformInvitation,
    platformInvitation => platformInvitation.platform,
    {
      eager: false,
      cascade: true,
    }
  )
  platformInvitations!: PlatformInvitation[];
}
