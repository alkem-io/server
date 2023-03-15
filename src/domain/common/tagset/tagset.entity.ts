import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Profile } from '@domain/community/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

export enum RestrictedTagsetNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
}

@Entity()
export class Tagset extends AuthorizableEntity implements ITagset {
  @Column({ default: RestrictedTagsetNames.DEFAULT })
  name!: string;

  @Column('simple-array')
  tags: string[];

  @ManyToOne(() => Profile, profile => profile.tagsets, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  constructor() {
    super();
    this.tags = [];
  }
}
