import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { StorageSpace } from '@domain/storage/storage-space/storage.space.entity';
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

  @OneToOne(() => StorageSpace, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageSpace!: StorageSpace;
}
