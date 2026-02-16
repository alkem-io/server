import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { MediaGallery } from '../media-gallery/media.gallery.entity';
import { VISUAL_ALLOWED_TYPES } from './visual.constraints';
import { IVisual } from './visual.interface';

export class Visual extends AuthorizableEntity implements IVisual {
  name!: string;

  uri!: string;

  minWidth!: number;

  maxWidth!: number;

  minHeight!: number;

  maxHeight!: number;

  aspectRatio!: number;

  allowedTypes: string[];

  alternativeText?: string;

  profile?: Profile;

  mediaGallery?: MediaGallery;

  sortOrder?: number;

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
