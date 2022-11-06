import { Column, Entity, ManyToOne } from 'typeorm';
import { IReference } from './reference.interface';
import { Context } from '@domain/context/context/context.entity';
import { Profile } from '@domain/community/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { CardProfile } from '@domain/collaboration/card-profile/card.profile.entity';

@Entity()
export class Reference extends AuthorizableEntity implements IReference {
  @Column()
  name: string;

  @Column('text')
  uri: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(() => Context, context => context.references, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  @ManyToOne(() => CardProfile, profile => profile.references, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  cardProfile?: CardProfile;

  @ManyToOne(() => Profile, profile => profile.references, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  constructor(name: string, uri: string, description?: string) {
    super();
    this.name = name;
    this.uri = uri || '';
    this.description = '';
    if (description) {
      this.description = description;
    }
  }
}
