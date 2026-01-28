import { UUID_LENGTH } from '@common/constants';
import { Visual } from '@domain/common/visual/visual.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '../entity/authorizable-entity';
import { IMediaGallery } from './media.gallery.interface';

@Entity()
export class MediaGallery extends AuthorizableEntity implements IMediaGallery {
  @Column('uuid', { nullable: true })
  createdBy?: string;

  @OneToMany(
    () => Visual,
    visual => visual.mediaGallery,
    {
      eager: false,
      cascade: true,
    }
  )
  visuals!: Visual[];

  @OneToOne(() => StorageBucket, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageBucket?: StorageBucket;
}
