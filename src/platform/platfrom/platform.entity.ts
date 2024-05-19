import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Library } from '@library/library/library.entity';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { LicenseManager } from '@platform/license-manager/license.manager.entity';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {
  @OneToOne(() => Communication, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communication?: Communication;

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

  @OneToOne(() => LicenseManager, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licenseManager?: LicenseManager;
}
