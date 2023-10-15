import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TagsetType } from '@common/enums/tagset.type';
import { TagsetTemplate } from '../tagset-template/tagset.template.entity';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

@Entity()
export class Tagset extends AuthorizableEntity implements ITagset {
  @Column('varchar', {
    default: TagsetReservedName.DEFAULT,
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column('varchar', {
    default: TagsetType.FREEFORM,
    length: 255,
    nullable: false,
  })
  type!: TagsetType;

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
