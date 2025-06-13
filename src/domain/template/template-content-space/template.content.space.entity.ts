import { Column, Entity, Generated, JoinColumn, OneToOne } from 'typeorm';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { ITemplateContentSpace } from './template.content.space.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpaceLevel } from '@common/enums/space.level';
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

  @Column('json', { nullable: false })
  settings!: ISpaceSettings;

  @Column('int', { nullable: false })
  level!: SpaceLevel;

  // Later: add in application form, community roles, hierarchy so with subspaces etc.
}
