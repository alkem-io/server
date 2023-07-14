import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TagsetTemplate } from '../tagset-template';

@Entity()
export class Tagset extends AuthorizableEntity implements ITagset {
  @Column('simple-array')
  tags!: string[];

  @ManyToOne(() => Profile, profile => profile.tagsets, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  @ManyToOne(() => TagsetTemplate, tagsetTemplate => tagsetTemplate.tagsets, {
    eager: false,
    cascade: false,
  })
  tagsetTemplate?: TagsetTemplate;

  constructor() {
    super();
    this.tags = [];
  }
}
