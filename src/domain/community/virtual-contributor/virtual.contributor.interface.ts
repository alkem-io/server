import { Field, ObjectType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { IAccount } from '@domain/space/account/account.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { UUID, NameID } from '@domain/common/scalars';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { ISpace } from '@domain/space/space/space.interface';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.definition.dto';
import { IAiPersona } from '@services/ai-server/ai-persona';
import { IVirtualContributorPlatformSettings } from '@domain/community/virtual-contributor-platform-settings';
import { IActor, IActorFull } from '@domain/actor/actor/actor.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('VirtualContributor', {
  implements: () => [IActorFull],
})
export class IVirtualContributor extends IActor implements IActorFull {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  declare nameID: string;

  // Override to make profile required for contributors
  declare profile: IProfile;

  // VirtualContributor extends Actor - credentials are on Actor.credentials

  rowId!: number;

  account?: IAccount;

  aiPersonaID!: string;

  @Field(() => IAiPersona, {
    nullable: true,
    description: 'The AI persona associated with this Virtual Contributor.',
  })
  aiPersona?: IAiPersona;

  @Field(() => PromptGraphDefinition, {
    nullable: true,
    description: 'Prompt graph definition for this Virtual Contributor.',
  })
  promptGraphDefinition?: PromptGraphDefinition;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the VC in searches.',
    nullable: false,
  })
  @IsEnum(SearchVisibility)
  searchVisibility!: SearchVisibility;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag to control if this VC is listed in the platform store.',
  })
  listedInStore!: boolean;

  @Field(() => IVirtualContributorSettings, {
    nullable: false,
    description: 'The settings of this Virtual Contributor.',
  })
  settings!: IVirtualContributorSettings;

  @Field(() => IVirtualContributorPlatformSettings, {
    nullable: false,
    description:
      'Platform-level settings of this Virtual Contributor, modifiable only by platform admins.',
  })
  platformSettings!: IVirtualContributorPlatformSettings;

  @Field(() => VirtualContributorDataAccessMode, {
    nullable: false,
    description:
      'The data access mode defining what data this Virtual Contributor can access.',
  })
  @IsEnum(VirtualContributorDataAccessMode)
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Field(() => VirtualContributorInteractionMode, {
    nullable: false,
    description: 'Interaction modes supported by this Virtual Contributor.',
  })
  @IsEnum([VirtualContributorInteractionMode], { each: true })
  interactionModes!: VirtualContributorInteractionMode[];

  @Field(() => VirtualContributorBodyOfKnowledgeType, {
    nullable: false,
    description:
      'The type of body of knowledge used by this Virtual Contributor.',
  })
  @IsEnum(VirtualContributorBodyOfKnowledgeType)
  bodyOfKnowledgeType!: VirtualContributorBodyOfKnowledgeType;

  @Field(() => ISpace, {
    nullable: true,
    description:
      'The Space linked to this Virtual Contributor as body of knowledge.',
  })
  knowledgeSpace?: ISpace;

  @Field(() => IKnowledgeBase, {
    nullable: false,
    description:
      'The Knowledge Base linked to this Virtual Contributor as body of knowledge.',
  })
  knowledgeBase!: IKnowledgeBase;

  @Field(() => Markdown, {
    nullable: true,
    description: 'Description of the body of knowledge for this VC.',
  })
  bodyOfKnowledgeDescription?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the body of knowledge used by this Virtual Contributor.',
  })
  bodyOfKnowledgeID?: string;
}
