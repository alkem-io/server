import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ILibrary } from './library.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';

@Entity()
export class Library extends AuthorizableEntity implements ILibrary {
  @OneToMany(() => InnovationPack, innovationPack => innovationPack.library, {
    eager: true,
    cascade: true,
  })
  innovationPacks?: InnovationPack[];

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator!: StorageAggregator;
}
