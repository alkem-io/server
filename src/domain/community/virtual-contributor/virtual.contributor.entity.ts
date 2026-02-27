import { randomUUID } from 'node:crypto';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { SearchVisibility } from '@common/enums/search.visibility';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { KnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { IVirtualContributorPlatformSettings } from '@domain/community/virtual-contributor-platform-settings';
import { Account } from '@domain/space/account/account.entity';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';
import { PromptGraphTransformer } from './transformers/prompt.graph.transformer';
import { IVirtualContributor } from './virtual.contributor.interface';

@Entity('virtual_contributor')
export class VirtualContributor
  extends BaseAlkemioEntity
  implements IVirtualContributor
{
  constructor() {
    super();
    const id = randomUUID();
    this.id = id;
    const actor = new Actor();
    actor.type = ActorType.VIRTUAL_CONTRIBUTOR;
    actor.id = id;
    this.actor = actor;
  }

  // Actor relation — shared primary key (virtual_contributor.id = actor.id)
  @OneToOne(() => Actor, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  actor?: Actor;

  // Transparent getters delegating to actor
  get type(): ActorType {
    return this.actor?.type as ActorType;
  }

  get authorization(): AuthorizationPolicy | undefined {
    return this.actor?.authorization;
  }

  set authorization(auth: AuthorizationPolicy | undefined) {
    if (!this.actor) this.actor = new Actor();
    this.actor.authorization = auth;
  }

  get credentials(): Credential[] | undefined {
    return this.actor?.credentials;
  }

  get profile(): Profile {
    return this.actor?.profile as Profile;
  }

  set profile(p: Profile) {
    if (!this.actor) this.actor = new Actor();
    this.actor.profile = p;
  }

  get nameID(): string {
    return this.actor?.nameID as string;
  }

  set nameID(val: string) {
    if (!this.actor) this.actor = new Actor();
    this.actor.nameID = val;
  }

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @ManyToOne(
    () => Account,
    account => account.virtualContributors,
    {
      eager: false,
      onDelete: 'SET NULL',
      nullable: true,
    }
  )
  account?: Account;

  @Column('jsonb', { nullable: false })
  settings!: IVirtualContributorSettings;

  @Column('jsonb', { nullable: false })
  platformSettings!: IVirtualContributorPlatformSettings;

  // Direct reference to AiPersona using aiPersonaID as potentially in a separate server.
  @Column('uuid', { nullable: false })
  aiPersonaID!: string;

  @Column('varchar', { nullable: true, length: SMALL_TEXT_LENGTH })
  bodyOfKnowledgeID?: string;

  @Column('jsonb', { nullable: true, transformer: PromptGraphTransformer })
  promptGraphDefinition?: PromptGraphDefinition;

  @Column()
  listedInStore!: boolean;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  searchVisibility!: SearchVisibility;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Column('simple-array', { nullable: false })
  interactionModes!: VirtualContributorInteractionMode[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  bodyOfKnowledgeType!: VirtualContributorBodyOfKnowledgeType;

  @OneToOne(() => KnowledgeBase, {
    eager: false,
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  knowledgeBase!: KnowledgeBase;

  @Column('text', { nullable: true })
  bodyOfKnowledgeDescription?: string;
}
