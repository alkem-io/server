import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Reference } from '@domain/common/reference/reference.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ICardProfile } from './card.profile.interface';
import { Location } from '@domain/common/location/location.entity';

@Entity()
export class CardProfile extends AuthorizableEntity implements ICardProfile {
  @OneToMany(() => Reference, reference => reference.cardProfile, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset?: Tagset;

  @Column('text', { nullable: true })
  description = '';

  @OneToOne(() => Location, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  location?: Location;
}
