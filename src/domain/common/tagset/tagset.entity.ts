import { ENUM_LENGTH } from '@common/constants';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Classification } from '../classification/classification.entity';
import { TagsetTemplate } from '../tagset-template/tagset.template.entity';

@Entity()
@Index('IDX_tagset_profileId', ['profile'])
export class Tagset extends AuthorizableEntity implements ITagset {
  @Column('varchar', {
    default: TagsetReservedName.DEFAULT,
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  type!: TagsetType;

  @Column('simple-array')
  tags!: string[];

  @ManyToOne(
    () => Profile,
    profile => profile.tagsets,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  profile?: Profile;

  @ManyToOne(
    () => Classification,
    classification => classification.tagsets,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  classification?: Classification;

  @ManyToOne(
    () => TagsetTemplate,
    tagsetTemplate => tagsetTemplate.tagsets,
    {
      eager: false,
      cascade: false,
    }
  )
  tagsetTemplate?: TagsetTemplate;

  constructor() {
    super();
    this.tags = [];
  }
}
