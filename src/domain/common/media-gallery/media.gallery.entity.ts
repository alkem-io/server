import { Entity, OneToMany, Column } from 'typeorm';
import { IMediaGallery } from './media.gallery.interface';
import { Visual } from '@domain/common/visual/visual.entity';

import { UUID_LENGTH } from '@common/constants';
import { NameableEntity } from '../entity/nameable-entity';

@Entity()
export class MediaGallery extends NameableEntity implements IMediaGallery {
  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @OneToMany(() => Visual, visual => visual.mediaGallery, {
    eager: false,
    cascade: true,
  })
  visuals!: Visual[];
}
