import { ProfileType } from '@common/enums';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Location } from '@domain/common/location/location.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IProfile } from './profile.interface';

@Entity()
export class Profile extends AuthorizableEntity implements IProfile {
  @OneToMany(
    () => Reference,
    reference => reference.profile,
    {
      eager: false,
      cascade: true,
    }
  )
  references?: Reference[];

  @OneToMany(
    () => Tagset,
    tagset => tagset.profile,
    {
      eager: false,
      cascade: true,
    }
  )
  tagsets?: Tagset[];

  @OneToMany(
    () => Visual,
    visual => visual.profile,
    {
      eager: false,
      cascade: true,
    }
  )
  visuals?: Visual[];

  @Column('text', { nullable: false })
  displayName!: string;

  @Column('text', { nullable: true })
  tagline?: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ProfileType })
  type!: ProfileType;

  @OneToOne(() => Location, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  location?: Location;

  @OneToOne(() => StorageBucket, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageBucket?: StorageBucket;

  // Constructor
  constructor() {
    super();
  }
}
