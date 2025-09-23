import { Field, ObjectType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { IContributorBase } from '../contributor/contributor.base.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IContributor } from '../contributor/contributor.interface';
import { SearchVisibility } from '@common/enums/search.visibility';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { IVirtualContributorSettings } from '../virtual-contributor-settings/virtual.contributor.settings.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { UUID } from '@domain/common/scalars';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { ISpace } from '@domain/space/space/space.interface';
import { PromptGraphDefinition } from './dto/prompt-graph-definition/prompt.graph.defintion.dto';
import { IAiPersona } from '@services/ai-server/ai-persona';

@ObjectType('VirtualContributor', {
  implements: () => [IContributor],
})
export class IVirtualContributor
  extends IContributorBase
  implements IContributor
{
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
    nullable: false,
    description:
      'The ID of the body of knowledge used by this Virtual Contributor.',
  })
  bodyOfKnowledgeID!: string;
}
