import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IVisual } from './visual.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { ALT_TEXT_LENGTH, URI_LENGTH } from '@common/constants';
import { VISUAL_ALLOWED_TYPES } from './visual.constraints';
import { MediaGallery } from '../media-gallery/media.gallery.entity';

@Entity()
@Index('IDX_visual_profileId', ['profile'])
export class Visual extends AuthorizableEntity implements IVisual {
  @Column()
  name!: string;

  @Column('varchar', { nullable: false, length: URI_LENGTH })
  uri!: string;

  @Column('int', { nullable: false })
  minWidth!: number;

  @Column('int', { nullable: false })
  maxWidth!: number;

  @Column('int', { nullable: false })
  minHeight!: number;

  @Column('int', { nullable: false })
  maxHeight!: number;

  @Column('decimal', { nullable: false, precision: 3, scale: 1 }) // < 99.9, > -99.9
  aspectRatio!: number;

  @Column('simple-array', { nullable: false })
  allowedTypes: string[];

  @Column('varchar', { length: ALT_TEXT_LENGTH, nullable: true })
  alternativeText?: string;

  @ManyToOne(() => Profile, profile => profile.visuals, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  @ManyToOne(() => MediaGallery, mediaGallery => mediaGallery.visuals, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  mediaGallery?: MediaGallery;

  constructor() {
    super();
    this.allowedTypes = [...VISUAL_ALLOWED_TYPES];
    this.minHeight = 0;
    this.maxHeight = 0;
    this.minWidth = 0;
    this.maxWidth = 0;
    this.aspectRatio = 1;
  }
}
