import { Column, Entity, OneToMany } from 'typeorm';
import { Reference } from '@domain/common/reference/reference.entity';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { IProfile } from './profile.interface';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Profile extends BaseCherrytwistEntity implements IProfile {
  @OneToMany(
    () => Reference,
    reference => reference.profile,
    { eager: true, cascade: true }
  )
  references?: Reference[];

  @OneToMany(
    () => Tagset,
    tagset => tagset.profile,
    { eager: true, cascade: true }
  )
  tagsets?: Tagset[];

  @Column('text', { nullable: true })
  avatar = '';

  @Column('text', { nullable: true })
  description = '';

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }
}
