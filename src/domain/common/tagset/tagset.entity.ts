import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagset } from '@domain/common/tagset';
import { Profile } from '@domain/community/profile';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}

@Entity()
export class Tagset extends BaseCherrytwistEntity implements ITagset {
  @Column({ default: RestrictedTagsetNames.Default })
  name: string;

  @Column('simple-array')
  tags: string[];

  @ManyToOne(
    () => Profile,
    profile => profile.tagsets
  )
  profile?: Profile;

  constructor(name: string) {
    super();
    this.tags = [];
    this.name = name;
  }
}
