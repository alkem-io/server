import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ILibrary } from './library.interface';

@Entity()
export class Library extends AuthorizableEntity implements ILibrary {
  @OneToMany(() => InnovationPack, innovationPack => innovationPack.library, {
    eager: true,
    cascade: true,
  })
  innovationPacks?: InnovationPack[];

  @OneToOne(() => StorageBucket, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageBucket!: StorageBucket;
}
