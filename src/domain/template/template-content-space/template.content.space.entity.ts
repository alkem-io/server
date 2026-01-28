import { SpaceLevel } from '@common/enums/space.level';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ITemplateContentSpace } from './template.content.space.interface';
@Entity()
export class TemplateContentSpace
  extends AuthorizableEntity
  implements ITemplateContentSpace
{
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @OneToMany(
    () => TemplateContentSpace,
    templateContentSpace => templateContentSpace.parentSpace,
    {
      eager: false,
      cascade: false, // Important: each subspace content saves itself
    }
  )
  subspaces?: TemplateContentSpace[];

  @ManyToOne(
    () => TemplateContentSpace,
    templateContentSpace => templateContentSpace.subspaces,
    {
      eager: false,
      cascade: false,
    }
  )
  parentSpace?: TemplateContentSpace;

  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @OneToOne(() => SpaceAbout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  about!: SpaceAbout;

  @Column('jsonb', { nullable: false })
  settings!: ISpaceSettings;

  @Column('int', { nullable: false })
  level!: SpaceLevel;

  // Later: add in application form, community roles, hierarchy so with subspaces etc.
}
