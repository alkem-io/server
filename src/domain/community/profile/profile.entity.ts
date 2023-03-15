import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Reference } from '@domain/common/reference/reference.entity';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { IProfile } from './profile.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { Location } from '@domain/common/location/location.entity';

@Entity()
export class Profile extends AuthorizableEntity implements IProfile {
  @OneToMany(() => Reference, reference => reference.profile, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @OneToMany(() => Tagset, tagset => tagset.profile, {
    eager: false,
    cascade: true,
  })
  tagsets?: Tagset[];

  @OneToOne(() => Visual, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  avatar?: Visual;

  @Column('text', { nullable: true })
  description = '';

  @OneToOne(() => Location, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  location?: Location;

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.DEFAULT];
  }
}
