import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

export enum RestrictedTagsetNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

@Entity()
export class Tagset extends AuthorizableEntity implements ITagset {
  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column('simple-array')
  tags: string[];

  @ManyToOne(() => Profile, profile => profile.tagsets, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  constructor(name: string) {
    super();
    this.tags = [];
    this.name = name;
  }
}
