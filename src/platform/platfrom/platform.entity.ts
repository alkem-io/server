import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { StorageBucket } from '@domain/storage/storage-space/storage.space.entity';
import { Library } from '@library/library/library.entity';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';

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

  @OneToOne(() => StorageBucket, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageBucket!: StorageBucket;
}
