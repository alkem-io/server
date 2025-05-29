import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ITemplateContentSpace } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.interface';
import {
  ENUM_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  UUID_LENGTH,
} from '@common/constants';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Community } from '@domain/community/community/community.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Account } from '../account/account.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { TemplateContentSpaceVisibility } from '@common/enums/templateContentSpace.visibility';
import { TemplatesManager } from '@domain/template/templates-manager';
import { License } from '@domain/common/license/license.entity';
import { TemplateContentSpaceLevel } from '@common/enums/templateContentSpace.level';
import { ITemplateContentSpaceSettings } from '../templateContentSpace.settings/templateContentSpace.settings.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TemplateContentSpaceAbout } from '../templateContentSpace.about';
@Entity()
export class TemplateContentSpace
  extends AuthorizableEntity
  implements ITemplateContentSpace
{
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @OneToMany(
    () => TemplateContentSpace,
    templateContentSpace => templateContentSpace.parentTemplateContentSpace,
    {
      eager: false,
      cascade: false,
    }
  )
  subtemplateContentSpaces?: TemplateContentSpace[];

  @ManyToOne(
    () => TemplateContentSpace,
    templateContentSpace => templateContentSpace.subtemplateContentSpaces,
    {
      eager: false,
      cascade: false,
    }
  )
  parentTemplateContentSpace?: TemplateContentSpace;

  @ManyToOne(() => Account, account => account.templateContentSpaces, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  account?: Account;

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

  @OneToOne(() => TemplateContentSpaceAbout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  about!: TemplateContentSpaceAbout;

  @OneToOne(() => Community, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  community?: Community;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  @Column('json', { nullable: false })
  settings: ITemplateContentSpaceSettings;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  levelZeroTemplateContentSpaceID!: string;

  @Column('int', { nullable: false })
  level!: TemplateContentSpaceLevel;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  visibility!: TemplateContentSpaceVisibility;

  @OneToOne(() => TemplatesManager, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesManager?: TemplatesManager;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;

  constructor() {
    super();
    this.nameID = '';
    this.settings = {} as ITemplateContentSpaceSettings;
  }
}
