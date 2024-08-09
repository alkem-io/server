import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Library } from '@library/library/library.entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Licensing } from '@platform/licensing/licensing.entity';
import { Forum } from '@platform/forum/forum.entity';
import { PlatformInvitation } from '@platform/invitation/platform.invitation.entity';

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

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator!: StorageAggregator;

  @OneToOne(() => Licensing, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licensing?: Licensing;

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
